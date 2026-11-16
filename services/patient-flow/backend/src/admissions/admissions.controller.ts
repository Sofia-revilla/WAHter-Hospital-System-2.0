import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { AssignBedDto } from "./admissions.dto";
import { AdmissionsService } from "./admissions.service";

@ApiTags("admissions")
@ApiBearerAuth()
@Controller("admissions")
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Roles("AdmittingClerk", "Physician", "Nurse", "System")
  @Get()
  listActive() {
    return this.admissions.listActive();
  }

  // Interoperability & Reporting reads this for FHIR Encounter and reports
  @Roles("System")
  @ApiQuery({ name: "patientId", required: false })
  @ApiQuery({ name: "from", required: false, example: "2026-11-01" })
  @ApiQuery({ name: "to", required: false, example: "2026-11-30" })
  @Get("history")
  history(@Query("patientId") patientId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.admissions.history({ patientId, from, to });
  }

  // UC-02 actors: the Admitting Clerk and the Nurse
  @Roles("AdmittingClerk", "Nurse")
  @Post()
  assign(@Body() body: AssignBedDto, @CurrentUser() user: AuthUser) {
    return this.admissions.assign(body, user);
  }
}
