import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export interface DiagnosticOrderRow {
  id: string;
  patient_id: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: "Urgent" | "Routine";
  status: "Pending" | "In-Progress" | "Completed";
  is_critical: boolean;
  ordered_by_id: string;
  ordered_at: Date;
  resulted_at: Date | null;
}

@Injectable()
export class DiagnosticsRepository {
  constructor(private readonly database: Database) {}

  findRecent(limit: number) {
    return this.database.query<DiagnosticOrderRow>(
      "SELECT * FROM diagnostic_orders ORDER BY ordered_at DESC LIMIT $1",
      [limit],
    );
  }

  create(order: {
    patientId: string;
    test: string;
    kind: "Laboratory" | "Radiology";
    priority: "Urgent" | "Routine";
    orderedById: string;
  }) {
    return this.database.one<DiagnosticOrderRow>(
      `INSERT INTO diagnostic_orders (id, patient_id, test, kind, priority, ordered_by_id)
       VALUES ((CASE WHEN $3 = 'Radiology' THEN 'RAD-' ELSE 'LAB-' END) || nextval('diagnostic_order_number'),
               $1, $2, $3, $4, $5)
       RETURNING *`,
      [order.patientId, order.test, order.kind, order.priority, order.orderedById],
    );
  }
}
