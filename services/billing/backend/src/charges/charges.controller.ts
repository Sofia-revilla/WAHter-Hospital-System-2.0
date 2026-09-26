import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Roles } from "@wahter/shared";
import { ChargesRepository } from "./charges.repository";

@ApiTags("charges")
@ApiBearerAuth()
@Controller("charges")
export class ChargesController {
  constructor(private readonly charges: ChargesRepository) {}

  // Billing Staff and the Hospital Admin only. Neither has a portal yet, so
  // this is closed for now; charges still show up in the audit log.
  @Roles("Billing Staff", "Hospital Administrator")
  @ApiQuery({ name: "patientId", required: false })
  @Get()
  async list(@Query("patientId") patientId?: string) {
    const rows = await this.charges.findByPatient(patientId);
    return rows.map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      code: row.code,
      description: row.description,
      quantity: row.quantity,
      unitAmount: Number(row.unit_amount),
      amount: Number(row.amount),
      isUnpriced: row.is_unpriced,
      source: row.source_type,
      postedAt: row.posted_at.toISOString(),
    }));
  }
}
