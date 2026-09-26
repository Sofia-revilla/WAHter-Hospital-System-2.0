import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { PatientsDirectory } from "../patients/patients.directory";
import type { CreateMedicationOrderDto, DispenseDto } from "./medications.dto";
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
    isControlled: row.is_controlled,
    dispensedQuantity: row.dispensed_quantity,
    dispensedBy: row.dispensed_by,
    dispensedAt: row.dispensed_at?.toISOString() ?? null,
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

  // UC-10: release a physician's order to the ward. Billing picks up the
  // medication.dispensed event and charges the drug (UC-12).
  async dispense(orderId: string, body: DispenseDto, user: AuthUser) {
    const existing = await this.orders.findById(orderId);
    if (!existing) throw new NotFoundException(`No medication order ${orderId}`);
    if (existing.status === "Review") {
      throw new ConflictException("This order is waiting on the prescriber's review, so it can't be dispensed yet.");
    }
    if (existing.status === "Dispensed") {
      throw new ConflictException(`Already dispensed by ${existing.dispensed_by ?? "another pharmacist"}.`);
    }
    // TODO(Phase 9b): step-up approval with a second pharmacist's credentials
    // (master prompt section 13). Until then controlled drugs are refused
    // instead of going out with one signature.
    if (existing.is_controlled) {
      throw new ConflictException(
        `${existing.drug} is an RA 9165 dangerous drug and needs a second pharmacist's approval, which isn't built yet.`,
      );
    }

    const row = await this.orders.dispense(orderId, {
      quantity: body.quantity,
      note: body.note?.trim() || undefined,
      by: user.name,
      byId: user.id,
    });
    if (!row) throw new ConflictException("Someone else just dispensed this order.");

    const order = toMedicationOrder(row);
    this.bus.publish(
      EVENT_TYPES.medicationDispensed,
      { orderId: order.id, patientId: order.patientId, drug: order.drug, quantity: body.quantity },
      user,
    );
    return order;
  }
}
