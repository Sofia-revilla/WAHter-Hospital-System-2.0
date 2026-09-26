import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface ChargeMasterRow {
  code: string;
  description: string;
  amount: string;
}

export interface ChargeRow {
  id: string;
  patient_id: string;
  code: string | null;
  description: string;
  quantity: number;
  unit_amount: string;
  amount: string;
  is_unpriced: boolean;
  source_type: string;
  posted_at: Date;
}

@Injectable()
export class ChargesRepository {
  constructor(private readonly database: Database) {}

  findPrice(matchKey: string) {
    return this.database.one<ChargeMasterRow>(
      "SELECT code, description, amount FROM charge_master WHERE lower(match_key) = lower($1)",
      [matchKey],
    );
  }

  findByPatient(patientId: string | undefined) {
    return this.database.query<ChargeRow>(
      `SELECT * FROM charges
        WHERE ($1::text IS NULL OR patient_id = $1)
        ORDER BY posted_at DESC
        LIMIT 500`,
      [patientId ?? null],
    );
  }

  // ON CONFLICT on the source event: the same event can't post two charges
  post(charge: {
    patientId: string;
    code: string | null;
    description: string;
    quantity: number;
    unitAmount: number;
    isUnpriced: boolean;
    sourceEventId: string;
    sourceType: string;
  }) {
    return this.database.one<ChargeRow>(
      `INSERT INTO charges (id, patient_id, code, description, quantity, unit_amount, amount, is_unpriced,
                            source_event_id, source_type)
       VALUES ('CHG-' || lpad(nextval('charge_number')::text, 6, '0'), $1, $2, $3, $4, $5, $4::integer * $5::numeric, $6, $7, $8)
       ON CONFLICT (source_event_id) DO NOTHING
       RETURNING *`,
      [
        charge.patientId,
        charge.code,
        charge.description,
        charge.quantity,
        charge.unitAmount,
        charge.isUnpriced,
        charge.sourceEventId,
        charge.sourceType,
      ],
    );
  }
}
