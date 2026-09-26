import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { ChargesRepository, type AccountRow, type ChargeRow } from "./charges.repository";

function toCharge(row: ChargeRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name ?? row.patient_id,
    code: row.code,
    description: row.description,
    quantity: row.quantity,
    unitAmount: Number(row.unit_amount),
    amount: Number(row.amount),
    isUnpriced: row.is_unpriced,
    source: row.source_type,
    postedAt: row.posted_at.toISOString(),
  };
}

function toAccount(row: AccountRow) {
  return {
    patientId: row.patient_id,
    patientName: row.patient_name ?? row.patient_id,
    total: Number(row.total),
    items: Number(row.items),
    unpriced: Number(row.unpriced),
    lastPostedAt: row.last_posted_at.toISOString(),
  };
}

@Injectable()
export class ChargesService {
  constructor(
    private readonly charges: ChargesRepository,
    private readonly bus: EventBus,
  ) {}

  async list(patientId?: string) {
    return (await this.charges.findByPatient(patientId)).map(toCharge);
  }

  async accounts() {
    return (await this.charges.accounts()).map(toAccount);
  }

  // Only unpriced lines can be priced here. Correcting an already priced
  // charge needs a supervisor's adjustment, which comes with Phase 6.
  async price(id: string, body: { unitAmount: number; reason: string }, user: AuthUser) {
    const existing = await this.charges.findById(id);
    if (!existing) throw new NotFoundException(`No charge ${id}`);
    if (!existing.is_unpriced) throw new ConflictException("This charge already has a price.");

    const priced = await this.charges.price(id, {
      unitAmount: body.unitAmount,
      reason: body.reason.trim(),
      by: user.name,
      byId: user.id,
    });
    if (!priced) throw new ConflictException("Someone else just priced this charge.");

    const charge = toCharge((await this.charges.findById(id))!);
    this.bus.publish(
      EVENT_TYPES.chargePriced,
      { chargeId: charge.id, patientId: charge.patientId, amount: charge.amount },
      user,
    );
    return charge;
  }
}
