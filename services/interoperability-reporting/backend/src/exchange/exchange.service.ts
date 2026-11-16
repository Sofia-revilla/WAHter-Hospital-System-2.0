import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import {
  Database,
  EVENT_TYPES,
  EventBus,
  ServiceClient,
  ServiceUnavailableError,
  type EventEnvelope,
  type EventPayloads,
} from "@wahter/shared";
import { toFhirPatient, validateFhirPatient, type PatientRecord } from "../fhir/fhir.mapper";

// The outbox to WAH Systems (UC-01 step 9 and extension 9a). New, changed,
// and merged patients queue a transaction; a worker sends what's due. If WAH
// Systems can't be reached the transaction stays Pending with a growing wait
// between tries, and nothing local is undone. A rejection is kept with its reason.

const WORKER_INTERVAL_MS = 10_000;
const BATCH_SIZE = 20;
const FIRST_RETRY_SECONDS = 15;
const MAX_RETRY_SECONDS = 600;
const SEND_TIMEOUT_MS = 5000;

interface TransactionRow {
  id: string;
  resource_type: string;
  resource_id: string;
  operation: "Create" | "Update" | "Merge";
  attempts: number;
}

type Outcome = { status: "Sent"; externalId: string | null } | { status: "Pending" | "Rejected"; error: string };

export function retryDelaySeconds(attempts: number) {
  return Math.min(FIRST_RETRY_SECONDS * 2 ** Math.max(0, attempts - 1), MAX_RETRY_SECONDS);
}

@Injectable()
export class ExchangeService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
    private readonly services: ServiceClient,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      "interoperability-reporting.patient-exchange",
      [EVENT_TYPES.patientRegistered, EVENT_TYPES.patientUpdated, EVENT_TYPES.patientMerged],
      (event) => this.enqueue(event),
    );
    this.timer = setInterval(() => void this.sendDue(), WORKER_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async enqueue(event: EventEnvelope) {
    const [resourceId, operation] =
      event.type === EVENT_TYPES.patientMerged
        ? [(event.data as EventPayloads["patient.merged"]).targetId, "Merge"]
        : [(event.data as { patientId: string }).patientId, event.type === EVENT_TYPES.patientRegistered ? "Create" : "Update"];
    await this.database.query(
      `INSERT INTO exchange_transactions (id, resource_type, resource_id, operation, source_event_id)
       VALUES ('EXT-' || lpad(nextval('exchange_transaction_number')::text, 6, '0'), 'Patient', $1, $2, $3)
       ON CONFLICT (source_event_id) DO NOTHING`,
      [resourceId, operation, event.eventId],
    );
    // try straight away instead of waiting for the next tick
    void this.sendDue();
  }

  // One run at a time in this container. Running two replicas would need
  // row locking here too; Compose runs one.
  async sendDue() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const due = await this.database.query<TransactionRow>(
        `SELECT id, resource_type, resource_id, operation, attempts FROM exchange_transactions
          WHERE status = 'Pending' AND next_attempt_at <= now()
          ORDER BY next_attempt_at
          LIMIT ${BATCH_SIZE}`,
      );
      for (const transaction of due) await this.attempt(transaction);
    } catch (error) {
      console.error("[interoperability-reporting] exchange worker failed", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async attempt(transaction: TransactionRow) {
    const outcome = await this.send(transaction);
    const attempts = transaction.attempts + 1;
    if (outcome.status === "Sent") {
      await this.database.query(
        `UPDATE exchange_transactions SET status = 'Sent', attempts = $2, external_id = $3, last_error = NULL,
                sent_at = now(), updated_at = now() WHERE id = $1`,
        [transaction.id, attempts, outcome.externalId],
      );
    } else {
      await this.database.query(
        `UPDATE exchange_transactions SET status = $2, attempts = $3, last_error = $4, updated_at = now(),
                next_attempt_at = now() + make_interval(secs => $5) WHERE id = $1`,
        [transaction.id, outcome.status, attempts, outcome.error, retryDelaySeconds(attempts)],
      );
    }
    this.bus.publish(EVENT_TYPES.exchangeUpdated, {
      transactionId: transaction.id,
      resourceType: transaction.resource_type,
      resourceId: transaction.resource_id,
      status: outcome.status,
      error: outcome.status === "Sent" ? null : outcome.error,
    });
  }

  private async send(transaction: TransactionRow): Promise<Outcome> {
    const endpoint = process.env.WAH_SYSTEMS_URL;
    if (!endpoint) return { status: "Pending", error: "No WAH Systems endpoint is configured." };

    let patient: PatientRecord | null;
    try {
      patient = await this.services.get<PatientRecord>("patient-registry", `/patients/${encodeURIComponent(transaction.resource_id)}`);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) return { status: "Pending", error: "The Patient Registry was unavailable." };
      throw error;
    }
    if (!patient) return { status: "Rejected", error: "The patient record no longer exists." };

    const resource = toFhirPatient(patient);
    // UC-09 3a in miniature: bad data is never sent, it's flagged for correction
    const problems = validateFhirPatient(resource);
    if (problems.length > 0) return { status: "Rejected", error: `Invalid Patient resource: ${problems.join("; ")}` };

    let response: Response;
    try {
      response = await fetch(`${endpoint.replace(/\/$/, "")}/fhir/Patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
          Authorization: `Bearer ${process.env.WAH_SYSTEMS_TOKEN ?? ""}`,
        },
        body: JSON.stringify(resource),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    } catch {
      return { status: "Pending", error: "WAH Systems is unavailable; will retry." };
    }
    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as { id?: string };
      return { status: "Sent", externalId: body.id ?? null };
    }
    if (response.status >= 500) return { status: "Pending", error: `WAH Systems answered ${response.status}; will retry.` };
    const reason = await response.text().catch(() => "");
    return { status: "Rejected", error: `WAH Systems rejected it (${response.status}): ${reason.slice(0, 200)}` };
  }
}
