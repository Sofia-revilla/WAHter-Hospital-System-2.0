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

  @Roles("Doctor", "Nurse")
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(@Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.diagnostics.list(Math.min(limit, 200));
  }

  // UC-11 step 1. Releasing results belongs to Lab/Radiology staff, who
  // don't have a portal yet.
  @Roles("Doctor")
  @Post()
  create(@Body() body: CreateDiagnosticOrderDto, @CurrentUser() user: AuthUser) {
    return this.diagnostics.create(body, user);
  }
}
