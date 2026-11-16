import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import type { EntryRow } from "./entries.repository";

function entry(overrides: Partial<EntryRow> = {}): EntryRow {
  return {
    id: "7",
    event_type: "access.login.succeeded",
    source: "access-provider-registry",
    actor_id: "EMP-0009",
    actor_name: "Alex Reyes",
    actor_role: "System Administrator",
    action: "LOGIN",
    outcome: "Success",
    resource: "Session (ACC-0009)",
    occurred_at: new Date("2026-11-17T00:00:00Z"),
    ...overrides,
  };
}

describe("audit CSV export (US-43)", () => {
  it("has a header row and one line per entry", () => {
    const lines = toCsv([entry(), entry({ id: "8" })]).trimEnd().split("\r\n");
    expect(lines[0]).toBe("id,time,actor_id,actor,role,action,outcome,resource,source,event_type");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"AU-7"');
  });

  it("keeps commas and quotes inside one column", () => {
    const line = toCsv([entry({ resource: 'Search "Smith, J"' })]).split("\r\n")[1];
    expect(line).toContain('"Search ""Smith, J"""');
  });

  it("defuses spreadsheet formulas (CSV injection)", () => {
    const line = toCsv([entry({ actor_name: "=HYPERLINK(\"x\")" })]).split("\r\n")[1];
    expect(line).toContain("\"'=HYPERLINK");
  });

  it("writes an empty cell for a missing actor ID", () => {
    const line = toCsv([entry({ actor_id: null })]).split("\r\n")[1];
    expect(line.split(",")[2]).toBe('""');
  });
});
