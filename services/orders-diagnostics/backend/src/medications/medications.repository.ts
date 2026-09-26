import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface MedicationOrderRow {
  id: string;
  patient_id: string;
  patient_name: string;
  drug: string;
  dose: string;
  frequency: string;
  route: string | null;
  duration: string | null;
  instructions: string | null;
  status: "Pending" | "Dispensed" | "Review";
  prescribed_by: string;
  ordered_at: Date;
}

@Injectable()
export class MedicationsRepository {
  constructor(private readonly database: Database) {}

  findRecent(limit: number) {
    return this.database.query<MedicationOrderRow>(
      `SELECT o.*, p.name AS patient_name
         FROM medication_orders o JOIN patients p ON p.id = o.patient_id
        ORDER BY o.ordered_at DESC
        LIMIT $1`,
      [limit],
    );
  }

  async create(order: {
    patientId: string;
    drug: string;
    dose: string;
    frequency: string;
    route?: string;
    duration?: string;
    instructions?: string;
    prescribedBy: string;
    prescribedById: string;
  }) {
    const inserted = await this.database.one<{ id: string }>(
      `INSERT INTO medication_orders (id, patient_id, drug, dose, frequency, route, duration, instructions,
                                      prescribed_by, prescribed_by_id)
       VALUES ('RX-' || nextval('medication_order_number'), $1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        order.patientId,
        order.drug,
        order.dose,
        order.frequency,
        order.route ?? null,
        order.duration ?? null,
        order.instructions ?? null,
        order.prescribedBy,
        order.prescribedById,
      ],
    );
    return this.database.one<MedicationOrderRow>(
      `SELECT o.*, p.name AS patient_name
         FROM medication_orders o JOIN patients p ON p.id = o.patient_id
        WHERE o.id = $1`,
      [inserted!.id],
    );
  }
}
