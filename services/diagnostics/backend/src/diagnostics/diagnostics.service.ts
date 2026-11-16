import { Injectable } from "@nestjs/common";
import { EVENT_TYPES, EventBus, requireKnownPatient, ServiceClient, type AuthUser } from "@wahter/shared";
import type { CreateDiagnosticOrderDto } from "./diagnostics.dto";
import { DiagnosticsRepository, type DiagnosticOrderRow } from "./diagnostics.repository";

function toDiagnosticOrder(row: DiagnosticOrderRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    test: row.test,
    kind: row.kind,
    priority: row.priority,
    status: row.status,
    isCritical: row.is_critical,
    orderedById: row.ordered_by_id,
    orderedAt: row.ordered_at.toISOString(),
    resultedAt: row.resulted_at?.toISOString() ?? null,
  };
}

@Injectable()
export class DiagnosticsService {
  constructor(
    private readonly orders: DiagnosticsRepository,
    private readonly services: ServiceClient,
    private readonly bus: EventBus,
  ) {}

  async list(limit: number) {
    return (await this.orders.findRecent(limit)).map(toDiagnosticOrder);
  }

  async create(body: CreateDiagnosticOrderDto, user: AuthUser) {
    await requireKnownPatient(this.services, body.patientId);
    const row = await this.orders.create({ ...body, orderedById: user.id });
    const order = toDiagnosticOrder(row!);
    // Billing listens for this to post the test fee (UC-05 extends UC-06)
    this.bus.publish(
      EVENT_TYPES.diagnosticOrdered,
      { orderId: order.id, patientId: order.patientId, test: order.test, kind: order.kind, priority: order.priority },
      user,
    );
    return order;
  }
}
