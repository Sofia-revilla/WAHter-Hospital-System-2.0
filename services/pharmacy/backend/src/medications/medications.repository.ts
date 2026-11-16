import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface MedicationOrderRow {
  id: string;
  patient_id: string;
  drug: string;
  dose: string;
  frequency: string;
  route: string | null;
  duration: string | null;
  instructions: string | null;
  status: "Pending" | "Dispensed" | "Review";
  prescribed_by_id: string;
  ordered_at: Date;
  dispensed_quantity: number | null;
  dispensed_by_id: string | null;
  dispensed_at: Date | null;
  is_controlled: boolean;
}

// the formulary is joined by name so the pharmacist sees the RA 9165 flag
const SELECT_ORDER = `SELECT o.*, coalesce(f.is_controlled, false) AS is_controlled
                        FROM medication_orders o
                        LEFT JOIN formulary f ON f.name = o.drug`;

@Injectable()
export class MedicationsRepository {
  constructor(private readonly database: Database) {}

  findRecent(limit: number) {
    return this.database.query<MedicationOrderRow>(`${SELECT_ORDER} ORDER BY o.ordered_at DESC LIMIT $1`, [limit]);
  }

  async create(order: {
    patientId: string;
    drug: string;
    dose: string;
    frequency: string;
    route?: string;
    duration?: string;
    instructions?: string;
    prescribedById: string;
  }) {
    const inserted = await this.database.one<{ id: string }>(
      `INSERT INTO medication_orders (id, patient_id, drug, dose, frequency, route, duration, instructions,
                                      prescribed_by_id)
       VALUES ('RX-' || nextval('medication_order_number'), $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        order.patientId,
        order.drug,
        order.dose,
        order.frequency,
        order.route ?? null,
        order.duration ?? null,
        order.instructions ?? null,
        order.prescribedById,
      ],
    );
    return this.findById(inserted!.id);
  }

  findById(id: string) {
    return this.database.one<MedicationOrderRow>(`${SELECT_ORDER} WHERE o.id = $1`, [id]);
  }

  // Only a Pending order can be dispensed. Returns null if it was already
  // dispensed or is under review, so two pharmacists can't release it twice.
  async dispense(id: string, fill: { quantity: number; note?: string; byId: string }) {
    const updated = await this.database.one<{ id: string }>(
      `UPDATE medication_orders
          SET status = 'Dispensed', dispensed_quantity = $2, dispense_note = $3,
              dispensed_by_id = $4, dispensed_at = now()
        WHERE id = $1 AND status = 'Pending'
        RETURNING id`,
      [id, fill.quantity, fill.note ?? null, fill.byId],
    );
    return updated ? this.findById(updated.id) : null;
  }
}
