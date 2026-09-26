import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { RecordVitalsDto } from "./vitals.dto";
import { VitalsService } from "./vitals.service";

@ApiTags("vitals")
@ApiBearerAuth()
@Controller("vitals")
export class VitalsController {
  constructor(private readonly vitals: VitalsService) {}

  @Roles("Doctor", "Nurse")
  @ApiQuery({ name: "patientId", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(
    @Query("patientId") patientId: string | undefined,
    @Query("limit", new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.vitals.list(patientId, Math.min(limit, 500));
  }

  // UC-05: nurse or physician charts vitals
  @Roles("Doctor", "Nurse")
  @Post()
  record(@Body() body: RecordVitalsDto, @CurrentUser() user: AuthUser) {
    return this.vitals.record(body, user);
  }
}
