import { Injectable } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { PatientsDirectory } from "../patients/patients.directory";
import type { CreateDiagnosticOrderDto } from "./diagnostics.dto";
import { DiagnosticsRepository, type DiagnosticOrderRow } from "./diagnostics.repository";

function toDiagnosticOrder(row: DiagnosticOrderRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patient: row.patient_name,
    test: row.test,
    kind: row.kind,
    priority: row.priority,
    status: row.status,
    isCritical: row.is_critical,
    orderedBy: row.ordered_by,
    orderedAt: row.ordered_at.toISOString(),
    resultedAt: row.resulted_at?.toISOString() ?? null,
  };
}

@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly orders: DiagnosticsRepository,
    private readonly patients: PatientsDirectory,
    private readonly bus: EventBus,
  ) {}

  async list(limit: number) {
    return (await this.orders.findRecent(limit)).map(toDiagnosticOrder);
  }

  async create(body: CreateDiagnosticOrderDto, user: AuthUser) {
    await this.patients.requireName(body.patientId);
    const row = await this.orders.create({ ...body, orderedBy: user.name, orderedById: user.id });
    const order = toDiagnosticOrder(row!);
    // Billing listens for this to post the test fee (UC-12)
    this.bus.publish(
      EVENT_TYPES.diagnosticOrdered,
      { orderId: order.id, patientId: order.patientId, test: order.test, kind: order.kind, priority: order.priority },
      user,
    );
    return order;
  }
}
