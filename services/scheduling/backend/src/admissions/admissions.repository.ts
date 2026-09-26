import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface AdmissionRow {
  id: string;
  patient_id: string;
  ward_id: string;
  bed_index: number;
  admission_type: string;
  attending_physician: string;
  assigned_by: string;
  assigned_at: Date;
}

export class BedTakenError extends Error {}

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";

@Injectable()
export class AdmissionsRepository {
  constructor(private readonly database: Database) {}

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
    attendingPhysician: string;
    assignedBy: string;
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
          `INSERT INTO admissions (id, patient_id, ward_id, bed_index, admission_type, attending_physician,
                                   assigned_by, assigned_by_id)
           VALUES ('ADM-' || lpad(nextval('admission_number')::text, 5, '0'), $1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            request.patientId,
            request.wardId,
            request.bedIndex,
            request.admissionType,
            request.attendingPhysician,
            request.assignedBy,
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
