import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface AdmissionRow {
  id: string;
  patient_id: string;
  ward_id: string;
  bed_index: number;
  admission_type: string;
  attending_physician_id: string;
  assigned_by_id: string;
  assigned_at: Date;
  ended_at: Date | null;
}

export class BedTakenError extends Error {}

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";

@Injectable()
export class AdmissionsRepository {
  constructor(private readonly database: Database) {}

  // Every admission row, ended ones included. A transfer ends one row and
  // starts the next, so a stay with one transfer is two rows.
  findHistory(filter: { patientId?: string; from?: string; to?: string }) {
    return this.database.query<AdmissionRow>(
      `SELECT * FROM admissions
        WHERE ($1::text IS NULL OR patient_id = $1)
          AND ($2::date IS NULL OR assigned_at >= $2::date)
          AND ($3::date IS NULL OR assigned_at < $3::date + 1)
        ORDER BY assigned_at DESC
        LIMIT 1000`,
      [filter.patientId ?? null, filter.from ?? null, filter.to ?? null],
    );
  }

  findActive() {
    return this.database.query<AdmissionRow>("SELECT * FROM admissions WHERE ended_at IS NULL ORDER BY assigned_at");
  }

  // Ends the patient's current bed (if any) and takes the new one in one
  // transaction, so a failed transfer leaves them where they were
  async assign(request: {
    patientId: string;
    wardId: string;
    bedIndex: number;
    admissionType: string;
    attendingPhysicianId: string;
    assignedById: string;
  }) {
    try {
      return await this.database.transaction(async (client) => {
        const previous = await client.query<AdmissionRow>(
          `UPDATE admissions SET ended_at = now(), end_reason = 'Transferred'
            WHERE patient_id = $1 AND ended_at IS NULL
            RETURNING *`,
          [request.patientId],
        );
        const inserted = await client.query<AdmissionRow>(
          `INSERT INTO admissions (id, patient_id, ward_id, bed_index, admission_type, attending_physician_id,
                                   assigned_by_id)
           VALUES ('ADM-' || lpad(nextval('admission_number')::text, 5, '0'), $1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            request.patientId,
            request.wardId,
            request.bedIndex,
            request.admissionType,
            request.attendingPhysicianId,
            request.assignedById,
          ],
        );
        return { admission: inserted.rows[0], previous: previous.rows[0] ?? null };
      });
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) throw new BedTakenError();
      throw error;
    }
  }
}
