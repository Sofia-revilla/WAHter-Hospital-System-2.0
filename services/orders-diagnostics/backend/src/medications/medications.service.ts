import { Injectable } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { PatientsDirectory } from "../patients/patients.directory";
import type { CreateMedicationOrderDto } from "./medications.dto";
import { MedicationsRepository, type MedicationOrderRow } from "./medications.repository";

function toMedicationOrder(row: MedicationOrderRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    drug: row.drug,
    dose: row.dose,
    frequency: row.frequency,
    route: row.route,
    duration: row.duration,
    instructions: row.instructions,
    status: row.status,
    prescribedBy: row.prescribed_by,
    orderedAt: row.ordered_at.toISOString(),
  };
}

@Injectable()
export class MedicationsService {
  constructor(
    private readonly orders: MedicationsRepository,
    private readonly patients: PatientsDirectory,
    private readonly bus: EventBus,
  ) {}

  async list(limit: number) {
    return (await this.orders.findRecent(limit)).map(toMedicationOrder);
  }

  // TODO(Phase 5): formulary, allergy, and dose-range checks (UC-09 BR-01..03).
  // They need the allergy list from Clinical Records, which isn't charted yet.
  async create(body: CreateMedicationOrderDto, user: AuthUser) {
    await this.patients.requireName(body.patientId);
    const row = await this.orders.create({ ...body, prescribedBy: user.name, prescribedById: user.id });
    const order = toMedicationOrder(row!);
    this.bus.publish(
      EVENT_TYPES.medicationOrdered,
      { orderId: order.id, patientId: order.patientId, drug: order.drug },
      user,
    );
    return order;
  }
}
