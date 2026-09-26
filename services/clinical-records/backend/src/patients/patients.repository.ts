import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface CensusRow {
  id: string;
  name: string;
  sex: "Male" | "Female";
  birth_date: Date;
  department: string;
  condition: string;
  admitted_at: Date;
  latest_mews: number | null;
  encounter_id: string;
}

@Injectable()
export class PatientsRepository {
  constructor(private readonly database: Database) {}

  // Inpatient census: everyone with an open encounter
  census() {
    return this.database.query<CensusRow>(
      `SELECT p.id, p.name, p.sex, p.birth_date,
              e.id AS encounter_id, e.department, e.condition, e.admitted_at, e.latest_mews
         FROM encounters e
         JOIN patients p ON p.id = e.patient_id
        WHERE e.discharged_at IS NULL
        ORDER BY p.id`,
    );
  }

  findOpenEncounter(patientId: string) {
    return this.database.one<CensusRow>(
      `SELECT p.id, p.name, p.sex, p.birth_date,
              e.id AS encounter_id, e.department, e.condition, e.admitted_at, e.latest_mews
         FROM encounters e
         JOIN patients p ON p.id = e.patient_id
        WHERE e.patient_id = $1 AND e.discharged_at IS NULL`,
      [patientId],
    );
  }

  // From patient.registered. Upsert, so a replayed event changes nothing.
  async upsertDemographics(patient: { id: string; name: string; sex: string; birthDate: string }) {
    await this.database.query(
      `INSERT INTO patients (id, name, sex, birth_date) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, sex = EXCLUDED.sex, birth_date = EXCLUDED.birth_date, updated_at = now()`,
      [patient.id, patient.name, patient.sex, patient.birthDate],
    );
  }

  // From patient.admitted: the admission opens the clinical encounter.
  // Department starts as the ward's service until a doctor reassigns it.
  async openEncounter(patientId: string, department: string, admittedAt: string) {
    await this.database.query(
      `INSERT INTO encounters (id, patient_id, department, condition, admitted_at)
       SELECT 'ENC-' || lpad(nextval('encounter_number')::text, 4, '0'), $1, $2, 'Observation', $3
        WHERE EXISTS (SELECT 1 FROM patients WHERE id = $1)
       ON CONFLICT DO NOTHING`,
      [patientId, department, admittedAt],
    );
  }
}
