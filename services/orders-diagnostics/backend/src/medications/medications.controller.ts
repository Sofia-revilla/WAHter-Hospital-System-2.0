import { Body, Controller, DefaultValuePipe, Get, HttpCode, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { CreateMedicationOrderDto, DispenseDto } from "./medications.dto";
import { MedicationsService } from "./medications.service";

@ApiTags("medication orders")
@ApiBearerAuth()
@Controller("medication-orders")
export class MedicationsController {
  constructor(private readonly medications: MedicationsService) {}

  // Nurses read the queue to know what's ready to give on the ward; the
  // pharmacist works from it
  @Roles("Doctor", "Nurse", "Pharmacist")
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(@Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.medications.list(Math.min(limit, 200));
  }

  // UC-09: only the physician prescribes
  @Roles("Doctor")
  @Post()
  create(@Body() body: CreateMedicationOrderDto, @CurrentUser() user: AuthUser) {
    return this.medications.create(body, user);
  }

  // UC-10: only the pharmacist dispenses
  @Roles("Pharmacist")
  @HttpCode(200)
  @Post(":id/dispense")
  dispense(@Param("id") id: string, @Body() body: DispenseDto, @CurrentUser() user: AuthUser) {
    return this.medications.dispense(id, body, user);
  }
}
