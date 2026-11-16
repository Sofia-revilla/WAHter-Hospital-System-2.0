import { Body, Controller, Get, Post, ServiceUnavailableException } from "@nestjs/common";
import { ApiBearerAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsDateString } from "class-validator";
import {
  CurrentUser,
  Database,
  EVENT_TYPES,
  EventBus,
  Roles,
  ServiceClient,
  ServiceUnavailableError,
  type AuthUser,
} from "@wahter/shared";
import type { AdmissionRecord } from "../fhir/fhir.mapper";

class GenerateReportDto {
  @ApiProperty({ example: "2026-09-01" })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: "2026-09-30" })
  @IsDateString()
  periodEnd: string;
}

interface ReportRunRow {
  id: string;
  kind: string;
  period_start: Date;
  period_end: Date;
  generated_by_id: string;
  generated_at: Date;
  payload: { rows: { wardId: string; admissions: number }[] };
}

// UC-07, as an export file only: WAHter never submits to DOH directly
// (paper scope). Aggregate counts per ward, no patient identifiers.
// TODO(Phase 9): daily admission/discharge and utilization reports, FHSIS and
// PIDSR templates, PDF and Excel exports.
@ApiTags("hospital reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
    private readonly services: ServiceClient,
  ) {}

  // UC-07: only the Hospital Administrator runs reports
  @Roles("HospitalAdministrator")
  @Get()
  async list() {
    const rows = await this.database.query<ReportRunRow>("SELECT * FROM report_runs ORDER BY generated_at DESC");
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      periodStart: row.period_start.toISOString().slice(0, 10),
      periodEnd: row.period_end.toISOString().slice(0, 10),
      generatedById: row.generated_by_id,
      generatedAt: row.generated_at.toISOString(),
      rows: row.payload.rows,
    }));
  }

  @Roles("HospitalAdministrator")
  @Post("admissions-summary")
  async generate(@Body() body: GenerateReportDto, @CurrentUser() user: AuthUser) {
    let admissions: AdmissionRecord[];
    try {
      admissions =
        (await this.services.get<AdmissionRecord[]>(
          "patient-flow",
          `/admissions/history?from=${body.periodStart}&to=${body.periodEnd}`,
        )) ?? [];
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw new ServiceUnavailableException("Patient Flow is unavailable, so the report can't be built right now.");
      }
      throw error;
    }

    const perWard = new Map<string, number>();
    for (const admission of admissions) perWard.set(admission.wardId, (perWard.get(admission.wardId) ?? 0) + 1);
    const payload = {
      rows: [...perWard.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([wardId, count]) => ({ wardId, admissions: count })),
    };

    const run = await this.database.one<{ id: string }>(
      `INSERT INTO report_runs (id, kind, period_start, period_end, generated_by_id, payload)
       VALUES ('RPT-' || lpad(nextval('report_number')::text, 4, '0'), 'Admissions summary', $1, $2, $3, $4)
       RETURNING id`,
      [body.periodStart, body.periodEnd, user.id, JSON.stringify(payload)],
    );
    this.bus.publish(
      EVENT_TYPES.reportGenerated,
      { reportId: run!.id, kind: "Admissions summary", period: `${body.periodStart}..${body.periodEnd}` },
      user,
    );
    return { id: run!.id, ...payload };
  }
}
