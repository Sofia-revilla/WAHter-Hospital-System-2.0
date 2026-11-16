import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface EncounterRow {
  id: string;
  patient_id: string;
  department: string;
  condition: string;
  admitted_at: Date;
  discharged_at: Date | null;
  latest_mews: number | null;
  latest_risk: string | null;
}

@Injectable()
export class EncountersRepository {
  constructor(private readonly database: Database) {}

  // Inpatient census: every open encounter
  findOpen() {
    return this.database.query<EncounterRow>(
      "SELECT * FROM encounters WHERE discharged_at IS NULL ORDER BY patient_id",
    );
  }

  findOpenForPatient(patientId: string) {
    return this.database.one<EncounterRow>(
      "SELECT * FROM encounters WHERE patient_id = $1 AND discharged_at IS NULL",
      [patientId],
    );
  }

  async moveDepartment(patientId: string, department: string) {
    await this.database.query(
      "UPDATE encounters SET department = $2 WHERE patient_id = $1 AND discharged_at IS NULL",
      [patientId, department],
    );
  }

  // From flow.patient.admitted: the admission opens the clinical encounter.
  // Department starts as the ward's service until a physician reassigns it.
  // ON CONFLICT: a replayed event, or a patient who already has one open.
  async open(patientId: string, department: string, admittedAt: string) {
    await this.database.query(
      `INSERT INTO encounters (id, patient_id, department, condition, admitted_at)
       VALUES ('ENC-' || lpad(nextval('encounter_number')::text, 4, '0'), $1, $2, 'Observation', $3)
       ON CONFLICT DO NOTHING`,
      [patientId, department, admittedAt],
    );
  }
}
