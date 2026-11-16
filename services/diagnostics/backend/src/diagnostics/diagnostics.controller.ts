import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { CreateDiagnosticOrderDto } from "./diagnostics.dto";
import { DiagnosticsService } from "./diagnostics.service";

@ApiTags("diagnostic orders")
@ApiBearerAuth()
@Controller("diagnostic-orders")
export class DiagnosticsController {
  constructor(private readonly diagnostics: DiagnosticsService) {}

  @Roles("Physician", "Nurse", "LaboratoryStaff", "RadiologyStaff")
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(@Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.diagnostics.list(Math.min(limit, 200));
  }

  // UC-05 steps 1 to 4: only the physician orders
  @Roles("Physician")
  @Post()
  create(@Body() body: CreateDiagnosticOrderDto, @CurrentUser() user: AuthUser) {
    return this.diagnostics.create(body, user);
  }
}
