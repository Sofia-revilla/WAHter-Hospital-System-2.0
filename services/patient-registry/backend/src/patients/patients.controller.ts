import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuditView, CurrentUser, Roles, type AuthUser, type CallerRole } from "@wahter/shared";
import { MatchPatientDto, RegisterPatientDto } from "./patients.dto";
import { PatientsService } from "./patients.service";

// Everyone who works with a named patient. The System Administrator isn't
// here: that portal never sees patient data (RA 10173). "System" is another
// service resolving IDs (comment matrix 7).
const READERS: CallerRole[] = [
  "AdmittingClerk",
  "Physician",
  "Nurse",
  "Pharmacist",
  "LaboratoryStaff",
  "RadiologyStaff",
  // US-5: billing finds the right patient for an invoice
  "BillingStaff",
  "System",
];

@ApiTags("patients (MPI)")
@ApiBearerAuth()
@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  // ?ids=A,B,C is how other screens turn the IDs they hold into names
  @Roles(...READERS)
  @ApiQuery({ name: "ids", required: false, description: "Comma-separated MPI numbers" })
  @ApiQuery({ name: "identifier", required: false, description: "One MPI number or PhilHealth PIN" })
  @Get()
  list(@Query("ids") ids?: string, @Query("identifier") identifier?: string) {
    const wanted = ids
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return this.patients.list({ ids: wanted, identifier: identifier?.trim() || undefined });
  }

  @Roles(...READERS)
  @AuditView({ record: "Patient record", idParam: "id", isPatientId: true })
  @Get(":id")
  get(@Param("id") id: string) {
    return this.patients.get(id);
  }

  @Roles("AdmittingClerk", "Nurse")
  @HttpCode(200)
  @Post("match")
  match(@Body() body: MatchPatientDto) {
    return this.patients.match(body);
  }

  // UC-01 actors: the Admitting Clerk, with the Nurse as secondary actor
  @Roles("AdmittingClerk", "Nurse")
  @Post()
  register(@Body() body: RegisterPatientDto, @CurrentUser() user: AuthUser) {
    return this.patients.register(body, user);
  }
}
