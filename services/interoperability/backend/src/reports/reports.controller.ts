import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsDateString } from "class-validator";
import { CurrentUser, Database, EVENT_TYPES, EventBus, Roles, type AuthUser } from "@wahter/shared";

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
  generated_by: string;
  generated_at: Date;
  payload: { rows: { wardId: string; admissions: number }[] };
}

// UC-15, as an export file only: WAHter never submits to DOH directly
// (paper scope). Aggregate counts per ward, no patient identifiers, which is
// why the IT portal may run it.
// TODO(Phase 7b): real AHSR and FHSIS templates once CDH confirms the formats.
@ApiTags("doh reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  @Roles("IT", "Hospital Administrator")
  @Get()
  async list() {
    const rows = await this.database.query<ReportRunRow>("SELECT * FROM report_runs ORDER BY generated_at DESC");
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      periodStart: row.period_start.toISOString().slice(0, 10),
      periodEnd: row.period_end.toISOString().slice(0, 10),
      generatedBy: row.generated_by,
      generatedAt: row.generated_at.toISOString(),
      rows: row.payload.rows,
    }));
  }

  @Roles("IT", "Hospital Administrator")
  @Post("admissions-summary")
  async generate(@Body() body: GenerateReportDto, @CurrentUser() user: AuthUser) {
    const rows = await this.database.query<{ ward_id: string; admissions: string }>(
      `SELECT ward_id, count(*) AS admissions FROM admissions
        WHERE admitted_at >= $1::date AND admitted_at < $2::date + 1
        GROUP BY ward_id ORDER BY ward_id`,
      [body.periodStart, body.periodEnd],
    );
    const payload = { rows: rows.map((row) => ({ wardId: row.ward_id, admissions: Number(row.admissions) })) };
    const run = await this.database.one<{ id: string }>(
      `INSERT INTO report_runs (id, kind, period_start, period_end, generated_by, payload)
       VALUES ('RPT-' || lpad(nextval('report_number')::text, 4, '0'), 'Admissions summary', $1, $2, $3, $4)
       RETURNING id`,
      [body.periodStart, body.periodEnd, user.name, JSON.stringify(payload)],
    );
    this.bus.publish(
      EVENT_TYPES.reportGenerated,
      { reportId: run!.id, kind: "Admissions summary", period: `${body.periodStart}..${body.periodEnd}` },
      user,
    );
    return { id: run!.id, ...payload };
  }
}
