import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { AdmitPatientDto, TransferDto } from "./admissions.dto";
import { AdmissionsService } from "./admissions.service";

@ApiTags("admissions (UC-02)")
@ApiBearerAuth()
@Controller("admissions")
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Roles("AdmittingClerk", "Physician", "Nurse", "System")
  @Get()
  listActive() {
    return this.admissions.listActive();
  }

  // Interoperability & Reporting reads this for FHIR Encounter and reports.
  // Declared before :id so "history" isn't read as an admission ID.
  @Roles("System")
  @ApiQuery({ name: "patientId", required: false })
  @ApiQuery({ name: "from", required: false, example: "2026-11-01" })
  @ApiQuery({ name: "to", required: false, example: "2026-11-30" })
  @Get("history")
  history(@Query("patientId") patientId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.admissions.history({ patientId, from, to });
  }

  @Roles("AdmittingClerk", "Physician", "Nurse", "System")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.admissions.get(id);
  }

  // UC-02 actors: the Admitting Clerk and the Nurse
  @Roles("AdmittingClerk", "Nurse")
  @Post()
  admit(@Body() body: AdmitPatientDto, @CurrentUser() user: AuthUser) {
    return this.admissions.admit(body, user);
  }

  // US-8: the nurse moves a patient
  @Roles("Nurse")
  @HttpCode(200)
  @Post(":id/transfer")
  transfer(@Param("id") id: string, @Body() body: TransferDto, @CurrentUser() user: AuthUser) {
    return this.admissions.transfer(id, body, user);
  }
}
