import { Body, Controller, DefaultValuePipe, Get, HttpCode, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiProperty, ApiQuery, ApiTags } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { EntriesRepository, type EntryRow } from "./entries.repository";

class ExportNoticeDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(0)
  rowCount: number;
}

// Same shape as the web app's AuditEntry
function toAuditEntry(row: EntryRow) {
  return {
    id: `AU-${row.id}`,
    time: row.occurred_at.toISOString(),
    actor: row.actor_name,
    role: row.actor_role,
    action: row.action,
    resource: row.resource,
  };
}

@ApiTags("audit trail")
@ApiBearerAuth()
@Controller("entries")
export class EntriesController {
  constructor(private readonly entries: EntriesRepository) {}

  // UC-16 meta-audit: every search is itself written to the trail before the
  // results come back, so nobody can browse the log without leaving a mark
  @Roles("IT")
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @Get()
  async search(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("limit", new DefaultValuePipe(100), ParseIntPipe) limit = 100,
  ) {
    const term = search?.trim() || undefined;
    await this.entries.append({
      eventId: null,
      eventType: "audit.queried",
      source: "audit-log",
      actorId: user.id,
      actorName: user.name,
      actorRole: "System Administrator",
      action: "AUDIT_QUERY",
      resource: term ? `Audit search "${term.slice(0, 60)}"` : "Audit log",
      occurredAt: new Date().toISOString(),
    });
    return (await this.entries.search(term, Math.min(limit, 500))).map(toAuditEntry);
  }

  // The CSV itself is built in the browser from rows this endpoint already
  // returned; this just records that someone took a copy (UC-16 meta-audit)
  @Roles("IT")
  @HttpCode(204)
  @Post("exports")
  async logExport(@Body() body: ExportNoticeDto, @CurrentUser() user: AuthUser) {
    await this.entries.append({
      eventId: null,
      eventType: "audit.exported",
      source: "audit-log",
      actorId: user.id,
      actorName: user.name,
      actorRole: "System Administrator",
      action: "EXPORT",
      resource: `Audit log CSV (${body.rowCount} rows)`,
      occurredAt: new Date().toISOString(),
    });
  }
}
