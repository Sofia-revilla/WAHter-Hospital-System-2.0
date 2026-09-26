import { Injectable, NotFoundException, type OnModuleInit } from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, type EventPayloads } from "@wahter/shared";

// Orders keep their own copy of patient names (from patient.registered) so an
// order can be checked against a real patient without calling Identity on
// every request.
@Injectable()
export class PatientsDirectory implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly database: Database,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("orders-diagnostics.patients", [EVENT_TYPES.patientRegistered], async (event) => {
      const data = event.data as EventPayloads["patient.registered"];
      await this.database.query(
        `INSERT INTO patients (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
        [data.patientId, data.name],
      );
    });
  }

  async requireName(patientId: string) {
    const row = await this.database.one<{ name: string }>("SELECT name FROM patients WHERE id = $1", [patientId]);
    // UC-10/UC-11: no order without a known patient
    if (!row) throw new NotFoundException(`No patient ${patientId}`);
    return row.name;
  }
}
