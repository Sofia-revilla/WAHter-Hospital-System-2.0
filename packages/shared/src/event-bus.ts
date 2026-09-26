import { randomUUID } from "node:crypto";
import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import type { Database } from "./database";
import {
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE,
  EVENT_EXCHANGE,
  type EventEnvelope,
  type EventPayloads,
  type EventType,
} from "./events";

// RabbitMQ wrapper. The paper's fault-isolation goal (objective 2) shapes
// it: publishing never throws into a request handler. If the broker is down,
// charting vitals still saves and the event is queued in memory until the
// connection comes back (UC-05 6a: vitals entry must succeed even if
// Notifications is unreachable).

const RECONNECT_DELAY_MS = 3000;
const MAX_PENDING = 1000;

export type Actor = EventEnvelope["actor"];

export type EventHandler = (event: EventEnvelope) => Promise<void>;

interface Subscription {
  queue: string;
  bindings: string[];
  handler: EventHandler;
}

export class EventBus {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly pending: EventEnvelope[] = [];
  private readonly subscriptions: Subscription[] = [];
  private isClosing = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly url: string,
    private readonly source: string,
    // used for the processed_events table that makes consumers idempotent
    private readonly database: Database | null,
  ) {}

  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.declareTopology(this.channel);

      this.connection.on("close", () => this.scheduleReconnect());
      this.connection.on("error", () => undefined);

      for (const subscription of this.subscriptions) {
        await this.startConsumer(subscription);
      }
      this.flushPending();
    } catch {
      this.connection = null;
      this.channel = null;
      this.scheduleReconnect();
    }
  }

  get isConnected() {
    return this.channel !== null;
  }

  publish<T extends EventType>(type: T, data: EventPayloads[T], actor: Actor = null) {
    const envelope: EventEnvelope<T> = {
      eventId: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      source: this.source,
      actor,
      data,
    };

    if (!this.channel || !this.send(envelope)) {
      // oldest events drop first if the broker stays down for a long time
      if (this.pending.length >= MAX_PENDING) this.pending.shift();
      this.pending.push(envelope);
    }
    return envelope;
  }

  // queue is named per service ("notifications.mews") so every replica of
  // a service shares one queue and a message is handled once
  async subscribe(queue: string, bindings: string[], handler: EventHandler) {
    const subscription = { queue, bindings, handler };
    this.subscriptions.push(subscription);
    if (this.channel) await this.startConsumer(subscription);
  }

  async close() {
    this.isClosing = true;
    await this.connection?.close().catch(() => undefined);
  }

  private async declareTopology(channel: Channel) {
    await channel.assertExchange(EVENT_EXCHANGE, "topic", { durable: true });
    // messages a consumer rejects end up here instead of looping forever
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, "fanout", { durable: true });
    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
    await channel.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, "");
  }

  private send(envelope: EventEnvelope) {
    try {
      return this.channel!.publish(EVENT_EXCHANGE, envelope.type, Buffer.from(JSON.stringify(envelope)), {
        persistent: true,
        contentType: "application/json",
        messageId: envelope.eventId,
      });
    } catch {
      return false;
    }
  }

  private flushPending() {
    while (this.pending.length > 0 && this.channel) {
      const next = this.pending[0];
      if (!this.send(next)) break;
      this.pending.shift();
    }
  }

  private async startConsumer({ queue, bindings, handler }: Subscription) {
    const channel = this.channel!;
    await channel.assertQueue(queue, { durable: true, deadLetterExchange: DEAD_LETTER_EXCHANGE });
    for (const binding of bindings) {
      await channel.bindQueue(queue, EVENT_EXCHANGE, binding);
    }
    await channel.prefetch(10);
    await channel.consume(queue, (message) => {
      if (message) void this.handle(channel, message, handler);
    });
  }

  private async handle(channel: Channel, message: ConsumeMessage, handler: EventHandler) {
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(message.content.toString()) as EventEnvelope;
    } catch {
      channel.nack(message, false, false);
      return;
    }

    try {
      if (await this.alreadyProcessed(envelope.eventId)) {
        channel.ack(message);
        return;
      }
      await handler(envelope);
      await this.markProcessed(envelope.eventId);
      channel.ack(message);
    } catch (error) {
      console.error(`[${this.source}] failed to handle ${envelope.type} ${envelope.eventId}`, error);
      // no requeue: a message that failed once will likely fail again, so it
      // goes to the dead-letter queue where someone can look at it
      channel.nack(message, false, false);
    }
  }

  private async alreadyProcessed(eventId: string) {
    if (!this.database) return false;
    const row = await this.database.one("SELECT 1 AS found FROM processed_events WHERE event_id = $1", [eventId]);
    return row !== null;
  }

  private async markProcessed(eventId: string) {
    if (!this.database) return;
    await this.database.query(
      "INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [eventId],
    );
  }

  private scheduleReconnect() {
    this.channel = null;
    this.connection = null;
    // "close" and a failed connect() can both land here; one retry is enough
    if (this.isClosing || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }
}
