import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface PatientRow {
  id: string;
  name: string;
  sex: "Male" | "Female";
  birth_date: Date;
  philhealth_pin: string | null;
  merged_into: string | null;
  created_at: Date;
}

@Injectable()
export class PatientsRepository {
  constructor(private readonly database: Database) {}

  findAll() {
    return this.database.query<PatientRow>("SELECT * FROM patients WHERE merged_into IS NULL ORDER BY id");
  }

  findById(id: string) {
    return this.database.one<PatientRow>("SELECT * FROM patients WHERE id = $1", [id]);
  }

  findByPin(pin: string) {
    return this.database.one<PatientRow>(
      "SELECT * FROM patients WHERE philhealth_pin = $1 AND merged_into IS NULL",
      [pin],
    );
  }

  // Narrow by the exact fields first; the fuzzy name check runs in the service
  findBySexAndBirthDate(sex: string, birthDate: string) {
    return this.database.query<PatientRow>(
      "SELECT * FROM patients WHERE sex = $1 AND birth_date = $2 AND merged_into IS NULL",
      [sex, birthDate],
    );
  }

  create(patient: { name: string; sex: string; birthDate: string; philhealthPin: string | null }) {
    return this.database.one<PatientRow>(
      `INSERT INTO patients (id, name, sex, birth_date, philhealth_pin)
       VALUES ('WAH-' || extract(year FROM now()) || '-' || lpad(nextval('patient_number')::text, 5, '0'),
               $1, $2, $3, $4)
       RETURNING *`,
      [patient.name, patient.sex, patient.birthDate, patient.philhealthPin],
    );
  }
}
