import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type EventPayloads } from "@wahter/shared";
import { EncountersRepository } from "./encounters.repository";

// The Patient Flow ward IDs map to a clinical department for a new encounter.
// Kept here instead of calling Patient Flow, so admission still opens an
// encounter while Patient Flow is busy or down.
const DEPARTMENT_FOR_WARD: Record<string, string> = {
  "W-001": "Internal Medicine",
  "W-002": "Internal Medicine",
  "W-003": "ICU",
  "W-004": "Pediatrics",
  "W-005": "Internal Medicine",
};

@Injectable()
export class EncountersConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly encounters: EncountersRepository,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("clinical-care.encounters", [EVENT_TYPES.patientAdmitted], async (event) => {
      const data = event.data as EventPayloads["flow.patient.admitted"];
      const department = DEPARTMENT_FOR_WARD[data.wardId] ?? "Internal Medicine";
      await this.encounters.open(data.patientId, department, event.occurredAt);
    });
  }
}
