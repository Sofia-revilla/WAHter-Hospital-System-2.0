import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuditView, CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { RecordVitalsDto } from "./vitals.dto";
import { VitalsService } from "./vitals.service";

@ApiTags("vitals")
@ApiBearerAuth()
@Controller("vitals")
export class VitalsController {
  constructor(private readonly vitals: VitalsService) {}

  @Roles("Physician", "Nurse")
  // one patient's vitals is opening their chart; the ward-wide list isn't
  @AuditView({ record: "Vital signs", idParam: "patientId", isPatientId: true })
  @ApiQuery({ name: "patientId", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(
    @Query("patientId") patientId: string | undefined,
    @Query("limit", new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.vitals.list(patientId, Math.min(limit, 500));
  }

  // UC-03: nurse or physician charts vitals
  @Roles("Physician", "Nurse")
  @Post()
  record(@Body() body: RecordVitalsDto, @CurrentUser() user: AuthUser) {
    return this.vitals.record(body, user);
  }
}
