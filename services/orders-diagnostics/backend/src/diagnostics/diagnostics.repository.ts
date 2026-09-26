import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface DiagnosticOrderRow {
  id: string;
  patient_id: string;
  patient_name: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: "Urgent" | "Routine";
  status: "Pending" | "In-Progress" | "Completed";
  is_critical: boolean;
  ordered_by: string;
  ordered_at: Date;
  resulted_at: Date | null;
}

const SELECT_WITH_NAME = `SELECT o.*, p.name AS patient_name
                            FROM diagnostic_orders o JOIN patients p ON p.id = o.patient_id`;

@Injectable()
export class DiagnosticsRepository {
  constructor(private readonly database: Database) {}

  findRecent(limit: number) {
    return this.database.query<DiagnosticOrderRow>(`${SELECT_WITH_NAME} ORDER BY o.ordered_at DESC LIMIT $1`, [limit]);
  }

  async create(order: {
    patientId: string;
    test: string;
    kind: "Laboratory" | "Radiology";
    priority: "Urgent" | "Routine";
    orderedBy: string;
    orderedById: string;
  }) {
    const inserted = await this.database.one<{ id: string }>(
      `INSERT INTO diagnostic_orders (id, patient_id, test, kind, priority, ordered_by, ordered_by_id)
       VALUES ((CASE WHEN $3 = 'Radiology' THEN 'RAD-' ELSE 'LAB-' END) || nextval('diagnostic_order_number'),
               $1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [order.patientId, order.test, order.kind, order.priority, order.orderedBy, order.orderedById],
    );
    return this.database.one<DiagnosticOrderRow>(`${SELECT_WITH_NAME} WHERE o.id = $1`, [inserted!.id]);
  }
}
