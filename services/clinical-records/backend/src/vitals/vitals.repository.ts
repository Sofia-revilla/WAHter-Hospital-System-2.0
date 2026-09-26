import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";
import type { RiskLevel, VitalSigns } from "@wahter/shared/mews";

export interface VitalsRow {
  id: string;
  patient_id: string;
  respiratory_rate: string;
  oxygen_saturation: string;
  temperature: string;
  systolic_bp: string;
  heart_rate: string;
  consciousness: VitalSigns["consciousness"];
  mews_score: number;
  risk: RiskLevel;
  had_implausible_reading: boolean;
  recorded_by: string;
  recorded_at: Date;
}

@Injectable()
export class VitalsRepository {
  constructor(private readonly database: Database) {}

  list(patientId: string | undefined, limit: number) {
    return this.database.query<VitalsRow>(
      `SELECT * FROM vitals
        WHERE ($1::text IS NULL OR patient_id = $1)
        ORDER BY recorded_at DESC
        LIMIT $2`,
      [patientId ?? null, limit],
    );
  }

  // The vitals row and the encounter's cached score change together, so the
  // census never shows a MEWS that doesn't match the newest charted set
  record(entry: {
    patientId: string;
    encounterId: string;
    vitals: VitalSigns;
    mewsScore: number;
    risk: RiskLevel;
    hadImplausibleReading: boolean;
    recordedBy: string;
    recordedById: string;
  }) {
    return this.database.transaction(async (client) => {
      const { rows } = await client.query<VitalsRow>(
        `INSERT INTO vitals (id, patient_id, encounter_id, respiratory_rate, oxygen_saturation, temperature,
                             systolic_bp, heart_rate, consciousness, mews_score, risk, had_implausible_reading,
                             recorded_by, recorded_by_id)
         VALUES ('VS-' || lpad(nextval('vitals_number')::text, 4, '0'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          entry.patientId,
          entry.encounterId,
          entry.vitals.respiratoryRate,
          entry.vitals.oxygenSaturation,
          entry.vitals.temperature,
          entry.vitals.systolicBp,
          entry.vitals.heartRate,
          entry.vitals.consciousness,
          entry.mewsScore,
          entry.risk,
          entry.hadImplausibleReading,
          entry.recordedBy,
          entry.recordedById,
        ],
      );
      await client.query("UPDATE encounters SET latest_mews = $1, latest_risk = $2 WHERE id = $3", [
        entry.mewsScore,
        entry.risk,
        entry.encounterId,
      ]);
      return rows[0];
    });
  }
}
