import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_TYPES, EventBus, requireKnownPatient, ServiceClient, type AuthUser } from "@wahter/shared";
import type { CreateMedicationOrderDto, DispenseDto } from "./medications.dto";
import { MedicationsRepository, type MedicationOrderRow } from "./medications.repository";

function toMedicationOrder(row: MedicationOrderRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    drug: row.drug,
    dose: row.dose,
    frequency: row.frequency,
    route: row.route,
    duration: row.duration,
    instructions: row.instructions,
    status: row.status,
    prescribedById: row.prescribed_by_id,
    orderedAt: row.ordered_at.toISOString(),
    isControlled: row.is_controlled,
    dispensedQuantity: row.dispensed_quantity,
    dispensedById: row.dispensed_by_id,
    dispensedAt: row.dispensed_at?.toISOString() ?? null,
  };
}

@Injectable()
export class MedicationsService {
  constructor(
    private readonly orders: MedicationsRepository,
    private readonly services: ServiceClient,
    private readonly bus: EventBus,
  ) {}

  async list(limit: number) {
    return (await this.orders.findRecent(limit)).map(toMedicationOrder);
  }

  // TODO(Phase 5): allergy and drug-interaction checks with a written
  // override (UC-04 4a). They need the allergy list from Clinical Care.
  async create(body: CreateMedicationOrderDto, user: AuthUser) {
    await requireKnownPatient(this.services, body.patientId);
    const row = await this.orders.create({ ...body, prescribedById: user.id });
    const order = toMedicationOrder(row!);
    this.bus.publish(
      EVENT_TYPES.medicationOrdered,
      { orderId: order.id, patientId: order.patientId, drug: order.drug },
      user,
    );
    return order;
  }

  // UC-04 steps 6 to 9: release a physician's order to the ward. Billing
  // picks up pharmacy.medication.dispensed and charges the drug (UC-04 extends UC-06).
  async dispense(orderId: string, body: DispenseDto, user: AuthUser) {
    const existing = await this.orders.findById(orderId);
    if (!existing) throw new NotFoundException(`No medication order ${orderId}`);
    if (existing.status === "Review") {
      throw new ConflictException("This order is waiting on the prescriber's review, so it can't be dispensed yet.");
    }
    if (existing.status === "Dispensed") {
      throw new ConflictException("This order was already dispensed.");
    }
    // TODO(Phase 5): step-up approval with a second pharmacist's credentials.
    // Until then controlled drugs are refused instead of going out with one signature.
    if (existing.is_controlled) {
      throw new ConflictException(
        `${existing.drug} is an RA 9165 dangerous drug and needs a second pharmacist's approval, which isn't built yet.`,
      );
    }

    const row = await this.orders.dispense(orderId, {
      quantity: body.quantity,
      note: body.note?.trim() || undefined,
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
