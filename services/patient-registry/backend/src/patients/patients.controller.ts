import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuditView, CurrentUser, Roles, type AuthUser, type CallerRole } from "@wahter/shared";
import { PatientDemographicsDto, RegisterPatientDto, ReportDuplicateDto, UpdatePatientDto } from "./patients.dto";
import { PatientsService } from "./patients.service";

// Everyone who works with a named patient. The System Administrator isn't
// here: that portal never sees patient data (RA 10173), except the two
// records side by side in Identity Review. "System" is another service
// resolving IDs (comment matrix 7).
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

// UC-01 actors: the Admitting Clerk, with the Nurse as secondary actor
const REGISTRARS: CallerRole[] = ["AdmittingClerk", "Nurse"];

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

  // US-2, US-5: search before registering. Declared before :id so "search"
  // isn't read as a patient ID.
  @Roles(...READERS)
  @ApiQuery({ name: "q", description: "MPI number, PhilHealth PIN, birth date (YYYY-MM-DD), or name" })
  @Get("search")
  search(@Query("q") query = "") {
    return this.patients.search(query);
  }

  @Roles(...READERS)
  @AuditView({ record: "Patient record", idParam: "id", isPatientId: true })
  @Get(":id")
  get(@Param("id") id: string) {
    return this.patients.get(id);
  }

  @Roles(...REGISTRARS)
  @HttpCode(200)
  @Post("match")
  match(@Body() body: PatientDemographicsDto) {
    return this.patients.match(body);
  }

  @Roles(...REGISTRARS)
  @Post()
  register(@Body() body: RegisterPatientDto, @CurrentUser() user: AuthUser) {
    return this.patients.register(body, user);
  }

  @Roles(...REGISTRARS)
  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patients.update(id, body, user);
  }

  // US-3, US-4: the desk and clinical staff can flag two records as maybe the
  // same person; the merge itself is the System Administrator's (UC-08 4b)
  @Roles("AdmittingClerk", "Nurse", "Physician")
  @Post(":id/duplicate-reports")
  reportDuplicate(@Param("id") id: string, @Body() body: ReportDuplicateDto, @CurrentUser() user: AuthUser) {
    return this.patients.reportDuplicate(id, body, user);
  }
}
