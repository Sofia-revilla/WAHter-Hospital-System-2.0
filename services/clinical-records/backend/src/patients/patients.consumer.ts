import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type EventEnvelope, type EventPayloads } from "@wahter/shared";
import { PatientsRepository } from "./patients.repository";

// The scheduling ward IDs map to a clinical department for a new encounter.
// Kept here instead of calling Scheduling, so admission still opens an
// encounter while Scheduling is busy or down.
const DEPARTMENT_FOR_WARD: Record<string, string> = {
  "W-001": "Internal Medicine",
  "W-002": "Internal Medicine",
  "W-003": "ICU",
  "W-004": "Pediatrics",
  "W-005": "Internal Medicine",
};

@Injectable()
export class PatientsConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly patients: PatientsRepository,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      "clinical-records.patients",
      [EVENT_TYPES.patientRegistered, EVENT_TYPES.patientAdmitted],
      (event) => this.handle(event),
    );
  }

  private async handle(event: EventEnvelope) {
    if (event.type === EVENT_TYPES.patientRegistered) {
      const data = event.data as EventPayloads["patient.registered"];
      await this.patients.upsertDemographics({
        id: data.patientId,
        name: data.name,
        sex: data.sex,
        birthDate: data.birthDate,
      });
    } else if (event.type === EVENT_TYPES.patientAdmitted) {
      const data = event.data as EventPayloads["patient.admitted"];
      const department = DEPARTMENT_FOR_WARD[data.wardId] ?? "Internal Medicine";
      await this.patients.openEncounter(data.patientId, department, event.occurredAt);
    }
  }
}
