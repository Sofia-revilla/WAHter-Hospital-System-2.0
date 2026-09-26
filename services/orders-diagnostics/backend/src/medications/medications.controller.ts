import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { CreateMedicationOrderDto } from "./medications.dto";
import { MedicationsService } from "./medications.service";

@ApiTags("medication orders")
@ApiBearerAuth()
@Controller("medication-orders")
export class MedicationsController {
  constructor(private readonly medications: MedicationsService) {}

  // Nurses read the queue to know what's ready to give on the ward
  @Roles("Doctor", "Nurse")
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(@Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.medications.list(Math.min(limit, 200));
  }

  // UC-09: only the physician prescribes. Dispensing (UC-10) is the
  // pharmacist's, who has no portal yet, so there's no dispense endpoint.
  @Roles("Doctor")
  @Post()
  create(@Body() body: CreateMedicationOrderDto, @CurrentUser() user: AuthUser) {
    return this.medications.create(body, user);
  }
}
