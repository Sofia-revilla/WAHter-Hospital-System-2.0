import { describe, expect, it } from "vitest";
import { EVENT_TYPES, type EventEnvelope } from "@wahter/shared";
import { resourceFor, roleLabel } from "./audit.consumer";

function envelope(type: string, data: object): EventEnvelope {
  return {
    eventId: "00000000-0000-0000-0000-000000000000",
    type: type as EventEnvelope["type"],
    occurredAt: "2026-11-17T00:00:00Z",
    source: "test",
    actor: null,
    data: data as EventEnvelope["data"],
  };
}

describe("audit resource labels (RA 10173: IDs only)", () => {
  it("labels a viewed record by kind and ID", () => {
    const label = resourceFor(
      envelope("patient-registry.record.viewed", { record: "Patient record", recordId: "WAH-2026-00001" }),
    );
    expect(label).toBe("Patient record WAH-2026-00001");
  });

  it("labels a denied request by method, path, and status", () => {
    const label = resourceFor(
      envelope("pharmacy.request.denied", { method: "POST", path: "/api/pharmacy/medication-orders", status: 403, reason: "x" }),
    );
    expect(label).toBe("POST /api/pharmacy/medication-orders (403)");
  });

  it("says which username a failed sign-in tried, and why", () => {
    const label = resourceFor(envelope(EVENT_TYPES.loginFailed, { username: "mtorres", reason: "Wrong password", accountId: "ACC-0011" }));
    expect(label).toBe('Sign-in as "mtorres": Wrong password');
  });

  it("shows a role change with both roles and the approval", () => {
    const label = resourceFor(
      envelope(EVENT_TYPES.roleChanged, { accountId: "ACC-1", fromRole: "Nurse", toRole: "Pharmacist", requestId: "APR-0001" }),
    );
    expect(label).toContain("Nurse → Pharmacist");
    expect(label).toContain("APR-0001");
  });
});

describe("role labels", () => {
  it("uses the use case diagram's names", () => {
    expect(roleLabel("AdmittingClerk")).toBe("Admitting Clerk");
    expect(roleLabel("SystemAdministrator")).toBe("System Administrator");
    expect(roleLabel(undefined)).toBe("System");
  });
});
