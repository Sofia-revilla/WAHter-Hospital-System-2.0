import { Body, Controller, DefaultValuePipe, Get, HttpCode, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiPropertyOptional, ApiQuery, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { AlertsService } from "./alerts.service";

class AcknowledgeAlertDto {
  @ApiPropertyOptional({ example: "Rechecked vitals, informed Dr. Mendoza" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFalseAlarm?: boolean;
}

@ApiTags("mews alerts")
@ApiBearerAuth()
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Roles("Doctor", "Nurse")
  @ApiQuery({ name: "limit", required: false })
  @Get()
  list(@Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number) {
    return this.alerts.list(Math.min(limit, 200));
  }

  @Roles("Doctor", "Nurse")
  @HttpCode(200)
  @Post(":id/acknowledge")
  acknowledge(@Param("id") id: string, @Body() body: AcknowledgeAlertDto, @CurrentUser() user: AuthUser) {
    return this.alerts.acknowledge(id, body, user);
  }
}
