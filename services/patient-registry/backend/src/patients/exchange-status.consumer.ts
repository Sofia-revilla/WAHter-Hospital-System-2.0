import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type EventPayloads } from "@wahter/shared";
import { PatientsRepository } from "./patients.repository";

// UC-01 step 9 and extension 9a: Interoperability & Reporting does the actual
// exchange with WAH Systems and reports back here, so the patient's profile
// can say whether WAH Systems has the latest identity or it's still pending.
@Injectable()
export class ExchangeStatusConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly patients: PatientsRepository,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("patient-registry.exchange-status", [EVENT_TYPES.exchangeUpdated], async (event) => {
      const data = event.data as EventPayloads["interop.exchange.updated"];
      if (data.resourceType !== "Patient") return;
      await this.patients.setExchangeStatus(data.resourceId, data.status, data.error);
    });
  }
}
