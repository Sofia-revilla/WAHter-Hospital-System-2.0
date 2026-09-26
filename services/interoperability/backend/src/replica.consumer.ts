import { Injectable, type OnModuleInit } from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, type EventEnvelope, type EventPayloads } from "@wahter/shared";

// Keeps this service's copies of patients and admissions current from the bus
@Injectable()
export class ReplicaConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly database: Database,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      "interoperability.replica",
      [EVENT_TYPES.patientRegistered, EVENT_TYPES.patientAdmitted],
      (event) => this.apply(event),
    );
  }

  private async apply(event: EventEnvelope) {
    if (event.type === EVENT_TYPES.patientRegistered) {
      const data = event.data as EventPayloads["patient.registered"];
      await this.database.query(
        `INSERT INTO patients (id, name, sex, birth_date, philhealth_pin) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name, sex = EXCLUDED.sex, birth_date = EXCLUDED.birth_date,
               philhealth_pin = EXCLUDED.philhealth_pin, updated_at = now()`,
        [data.patientId, data.name, data.sex, data.birthDate, data.philhealthPin],
      );
    } else if (event.type === EVENT_TYPES.patientAdmitted) {
      const data = event.data as EventPayloads["patient.admitted"];
      await this.database.query(
        `INSERT INTO admissions (admission_id, patient_id, ward_id, admission_type, admitted_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (admission_id) DO NOTHING`,
        [data.admissionId, data.patientId, data.wardId, data.admissionType, event.occurredAt],
      );
    }
  }
}
