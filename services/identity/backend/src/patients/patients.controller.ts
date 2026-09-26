import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { MatchPatientDto, RegisterPatientDto } from "./patients.dto";
import { PatientsService } from "./patients.service";

@ApiTags("patients (MPI)")
@ApiBearerAuth()
@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  // The IT portal never sees patient data (RA 10173), so no "IT" here
  @Roles("Doctor", "Nurse")
  @Get()
  list() {
    return this.patients.list();
  }

  @Roles("Doctor", "Nurse")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.patients.get(id);
  }

  @Roles("Doctor", "Nurse")
  @HttpCode(200)
  @Post("match")
  match(@Body() body: MatchPatientDto) {
    return this.patients.match(body);
  }

  // UC-01 belongs to the Patient Registrar, who has no portal yet, so the
  // nurse (who also admits, UC-04) registers for now
  @Roles("Nurse")
  @Post()
  register(@Body() body: RegisterPatientDto, @CurrentUser() user: AuthUser) {
    return this.patients.register(body, user);
  }
}
