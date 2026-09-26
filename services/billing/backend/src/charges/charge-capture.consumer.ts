import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type EventEnvelope, type EventPayloads } from "@wahter/shared";
import { ChargesRepository } from "./charges.repository";

// Charge capture (UC-12): Billing never gets asked to bill something. It
// listens for the clinical events that cost money and posts the charge
// itself, so a busy ward never has to remember to tell the billing office.
@Injectable()
export class ChargeCaptureConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly charges: ChargesRepository,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      "billing.charge-capture",
      [EVENT_TYPES.patientAdmitted, EVENT_TYPES.diagnosticOrdered, EVENT_TYPES.medicationDispensed],
      (event) => this.capture(event),
    );
    await this.bus.subscribe("billing.patients", [EVENT_TYPES.patientRegistered], async (event) => {
      const data = event.data as EventPayloads["patient.registered"];
      await this.charges.upsertPatient(data.patientId, data.name);
    });
  }

  private async capture(event: EventEnvelope) {
    const line = this.lineFor(event);
    if (!line) return;

    const price = await this.charges.findPrice(line.matchKey);
    const charge = await this.charges.post({
      patientId: line.patientId,
      code: price?.code ?? null,
      description: price?.description ?? line.fallbackDescription,
      quantity: line.quantity,
      unitAmount: price ? Number(price.amount) : 0,
      isUnpriced: !price,
      sourceEventId: event.eventId,
      sourceType: event.type,
    });

    // null means this event was already billed (a redelivery)
    if (charge) {
      this.bus.publish(EVENT_TYPES.chargePosted, {
        chargeId: charge.id,
        patientId: charge.patient_id,
        amount: Number(charge.amount),
        source: event.type,
      });
    }
  }

  private lineFor(event: EventEnvelope) {
    switch (event.type) {
      case EVENT_TYPES.patientAdmitted: {
        const data = event.data as EventPayloads["patient.admitted"];
        return {
          patientId: data.patientId,
          matchKey: data.wardId,
          fallbackDescription: `Bed in ward ${data.wardId}`,
          quantity: 1,
        };
      }
      case EVENT_TYPES.diagnosticOrdered: {
        const data = event.data as EventPayloads["diagnostic.ordered"];
        return { patientId: data.patientId, matchKey: data.test, fallbackDescription: data.test, quantity: 1 };
      }
      case EVENT_TYPES.medicationDispensed: {
        const data = event.data as EventPayloads["medication.dispensed"];
        return {
          patientId: data.patientId,
          matchKey: data.drug,
          fallbackDescription: data.drug,
          quantity: data.quantity,
        };
      }
      default:
        return null;
    }
  }
}
