import { Injectable } from "@nestjs/common";
import { Database, type PoolClient } from "@wahter/shared";
import type { SearchTerm } from "./matching";

export interface Address {
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
}

export interface PatientRow {
  id: string;
  name: string;
  given_name: string;
  middle_name: string | null;
  family_name: string;
  suffix: string | null;
  sex: "Male" | "Female";
  birth_date: Date;
  civil_status: string | null;
  contact_number: string | null;
  address: Address;
  philhealth_pin: string | null;
  merged_into: string | null;
  exchange_status: "Pending" | "Sent" | "Rejected";
  exchange_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NewPatient {
  givenName: string;
  middleName: string | null;
  familyName: string;
  suffix: string | null;
  sex: string;
  birthDate: string;
  civilStatus: string | null;
  contactNumber: string | null;
  address: Address;
  philhealthPin: string | null;
  createdById: string;
}

// "Juan Santos Dela Cruz Jr." as shown on every screen
export function displayName(parts: { givenName: string; middleName?: string | null; familyName: string; suffix?: string | null }) {
  return [parts.givenName, parts.middleName, parts.familyName, parts.suffix].filter(Boolean).join(" ").trim();
}

const COLUMN_FOR_FIELD: Record<string, string> = {
  givenName: "given_name",
  middleName: "middle_name",
  familyName: "family_name",
  suffix: "suffix",
  sex: "sex",
  birthDate: "birth_date",
  civilStatus: "civil_status",
  contactNumber: "contact_number",
  address: "address",
  philhealthPin: "philhealth_pin",
};

const SEARCH_LIMIT = 50;

@Injectable()
export class PatientsRepository {
  constructor(private readonly database: Database) {}

  findAll() {
    return this.database.query<PatientRow>("SELECT * FROM patients WHERE merged_into IS NULL ORDER BY id");
  }

  // merged records are included, so an old ID still shows who it was
  findByIds(ids: string[]) {
    return this.database.query<PatientRow>("SELECT * FROM patients WHERE id = ANY($1::text[]) ORDER BY id", [ids]);
  }

  // FHIR Patient?identifier= (UC-09): an MPI number or a PhilHealth PIN
  findByIdentifier(identifier: string) {
    return this.database.query<PatientRow>(
      "SELECT * FROM patients WHERE (id = $1 OR philhealth_pin = $1) AND merged_into IS NULL",
      [identifier],
    );
  }

  findById(id: string) {
    return this.database.one<PatientRow>("SELECT * FROM patients WHERE id = $1", [id]);
  }

  // US-2 and US-5. An MPI number finds the record even if it was merged
  // (the screen then points at the survivor); everything else only finds
  // active records.
  search(term: SearchTerm) {
    switch (term.kind) {
      case "mpi":
        return this.database.query<PatientRow>("SELECT * FROM patients WHERE id = $1", [term.value]);
      case "pin":
        return this.database.query<PatientRow>(
          "SELECT * FROM patients WHERE philhealth_pin = $1 AND merged_into IS NULL",
          [term.value],
        );
      case "birthDate":
        return this.database.query<PatientRow>(
          `SELECT * FROM patients WHERE birth_date = $1 AND merged_into IS NULL ORDER BY family_name LIMIT ${SEARCH_LIMIT}`,
          [term.value],
        );
      case "name": {
        // every word has to appear somewhere in the name, in any order
        const words = term.value.split(/\s+/).filter(Boolean).slice(0, 5);
        const clauses = words.map((_, index) => `name ILIKE $${index + 1}`).join(" AND ");
        return this.database.query<PatientRow>(
          `SELECT * FROM patients WHERE ${clauses || "true"} AND merged_into IS NULL
            ORDER BY family_name, given_name LIMIT ${SEARCH_LIMIT}`,
          words.map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`),
        );
      }
    }
  }

  // Everyone who could be the same person: the same PIN, the same birth
  // date, or the same family and given name. The fuzzy scoring is in matching.ts.
  findMatchCandidates(incoming: { birthDate: string; familyName: string; givenName: string; philhealthPin?: string | null }) {
    return this.database.query<PatientRow>(
      `SELECT * FROM patients
        WHERE merged_into IS NULL
          AND (birth_date = $1
               OR (lower(family_name) = lower($2) AND lower(given_name) = lower($3))
               OR ($4::text IS NOT NULL AND philhealth_pin = $4))
        LIMIT 200`,
      [incoming.birthDate, incoming.familyName.trim(), incoming.givenName.trim(), incoming.philhealthPin ?? null],
    );
  }

  async create(client: PoolClient, patient: NewPatient) {
    const { rows } = await client.query<PatientRow>(
      `INSERT INTO patients (id, name, given_name, middle_name, family_name, suffix, sex, birth_date, civil_status,
                             contact_number, address, philhealth_pin, created_by_id)
       VALUES ('WAH-' || extract(year FROM now()) || '-' || lpad(nextval('patient_number')::text, 5, '0'),
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        displayName(patient),
        patient.givenName,
        patient.middleName,
        patient.familyName,
        patient.suffix,
        patient.sex,
        patient.birthDate,
        patient.civilStatus,
        patient.contactNumber,
        JSON.stringify(patient.address),
        patient.philhealthPin,
        patient.createdById,
      ],
    );
    return rows[0];
  }

  // Only the fields that were sent; the display name follows the parts
  async update(id: string, changes: Record<string, unknown>) {
    const sets: string[] = [];
    const values: unknown[] = [id];
    for (const [field, value] of Object.entries(changes)) {
      const column = COLUMN_FOR_FIELD[field];
      if (!column) continue;
      values.push(field === "address" ? JSON.stringify(value) : value === "" ? null : value);
      sets.push(`${column} = $${values.length}`);
    }
    if (sets.length === 0) return this.findById(id);
    return this.database.transaction(async (client) => {
      const { rows } = await client.query<PatientRow>(
        `UPDATE patients
            SET ${sets.join(", ")},
                updated_at = now(),
                -- a changed identity has to be shared with WAH Systems again
                exchange_status = 'Pending',
                exchange_error = NULL
          WHERE id = $1 AND merged_into IS NULL
          RETURNING *`,
        values,
      );
      const row = rows[0];
      if (!row) return null;
      // the display name is rebuilt from the parts as they are now
      const name = displayName({
        givenName: row.given_name,
        middleName: row.middle_name,
        familyName: row.family_name,
        suffix: row.suffix,
      });
      const renamed = await client.query<PatientRow>("UPDATE patients SET name = $2 WHERE id = $1 RETURNING *", [
        id,
        name,
      ]);
      return renamed.rows[0];
    });
  }

  async setExchangeStatus(id: string, status: PatientRow["exchange_status"], error: string | null) {
    await this.database.query("UPDATE patients SET exchange_status = $2, exchange_error = $3 WHERE id = $1", [
      id,
      status,
      error,
    ]);
  }

  mergesInvolving(id: string) {
    return this.database.query<{ source_id: string; target_id: string; reason: string; merged_by_id: string; merged_at: Date }>(
      "SELECT * FROM patient_merges WHERE source_id = $1 OR target_id = $1 ORDER BY merged_at DESC",
      [id],
    );
  }
}
