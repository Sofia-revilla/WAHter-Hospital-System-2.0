import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { AssignBedDto } from "./admissions.dto";
import { AdmissionsService } from "./admissions.service";

@ApiTags("admissions")
@ApiBearerAuth()
@Controller("admissions")
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Roles("Doctor", "Nurse")
  @Get()
  listActive() {
    return this.admissions.listActive();
  }

  // UC-04 actors are the Patient Registrar and the Nurse; only the nurse has a portal
  @Roles("Nurse")
  @Post()
  assign(@Body() body: AssignBedDto, @CurrentUser() user: AuthUser) {
    return this.admissions.assign(body, user);
  }
}
