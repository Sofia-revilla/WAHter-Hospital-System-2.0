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

export interface AccountRow {
  patient_id: string;
  total: string;
  items: string;
  unpriced: string;
  last_posted_at: Date;
}

const SELECT_CHARGE = "SELECT c.* FROM charges c";

@Injectable()
export class ChargesRepository {
  constructor(private readonly database: Database) {}

  findPrice(matchKey: string) {
    return this.database.one<ChargeMasterRow>(
      "SELECT code, description, amount FROM charge_master WHERE lower(match_key) = lower($1)",
      [matchKey],
    );
  }

  findById(id: string) {
    return this.database.one<ChargeRow>(`${SELECT_CHARGE} WHERE c.id = $1`, [id]);
  }

  findByPatient(patientId: string | undefined) {
    return this.database.query<ChargeRow>(
      `${SELECT_CHARGE}
        WHERE ($1::text IS NULL OR c.patient_id = $1)
        ORDER BY c.posted_at DESC
        LIMIT 500`,
      [patientId ?? null],
    );
  }

  // One row per patient: running total, item count, and unpriced items left
  // One row per patient with an open account or any charge: running total,
  // item count, and unpriced items left. An account with no charges yet
  // still shows, dated when it opened.
  accounts() {
    return this.database.query<AccountRow>(
      `SELECT ids.patient_id,
              coalesce(sum(c.amount), 0) AS total,
              count(c.id) AS items,
              count(c.id) FILTER (WHERE c.is_unpriced) AS unpriced,
              coalesce(max(c.posted_at),
                       (SELECT max(opened_at) FROM patient_accounts a WHERE a.patient_id = ids.patient_id)) AS last_posted_at
         FROM (SELECT patient_id FROM charges UNION SELECT patient_id FROM patient_accounts) ids
         LEFT JOIN charges c ON c.patient_id = ids.patient_id
        GROUP BY ids.patient_id
        ORDER BY last_posted_at DESC`,
    );
  }

  // ON CONFLICT on the admission: a redelivered event doesn't open a second one
  async openAccount(patientId: string, admissionId: string, openedAt: string) {
    await this.database.query(
      `INSERT INTO patient_accounts (id, patient_id, admission_id, opened_at)
       VALUES ('ACCT-' || lpad(nextval('patient_account_number')::text, 6, '0'), $1, $2, $3)
       ON CONFLICT (admission_id) DO NOTHING`,
      [patientId, admissionId, openedAt],
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

  // Prices one unpriced line and logs the adjustment in the same transaction.
  // Returns null if someone priced it first.
  price(id: string, change: { unitAmount: number; reason: string; byId: string }) {
    return this.database.transaction(async (client) => {
      const { rows } = await client.query<{ amount: string }>(
        `SELECT amount FROM charges WHERE id = $1 AND is_unpriced FOR UPDATE`,
        [id],
      );
      if (rows.length === 0) return null;
      await client.query(
        `UPDATE charges
            SET unit_amount = $2, amount = quantity * $2::numeric, is_unpriced = false
          WHERE id = $1`,
        [id, change.unitAmount],
      );
      await client.query(
        `INSERT INTO charge_adjustments (charge_id, old_amount, new_amount, reason, adjusted_by_id)
         SELECT id, $2, amount, $3, $4 FROM charges WHERE id = $1`,
        [id, rows[0].amount, change.reason, change.byId],
      );
      return id;
    });
  }
}
