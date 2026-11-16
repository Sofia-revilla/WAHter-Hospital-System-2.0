import { describe, expect, it } from "vitest";
import {
  MAX_FAILED_ATTEMPTS,
  USERNAME_PATTERN,
  canDecide,
  maskEmail,
  removesLastAdmin,
  shouldLock,
  type AccountSnapshot,
} from "./access-rules";

describe("lockout (US-41, UC-08)", () => {
  it("locks at the fifth failure, not before", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(shouldLock(4)).toBe(false);
    expect(shouldLock(5)).toBe(true);
    expect(shouldLock(6)).toBe(true);
  });
});

describe("last active System Administrator (UC-08 extension 3a)", () => {
  const twoAdmins: AccountSnapshot[] = [
    { id: "ACC-A", role: "SystemAdministrator", status: "Active" },
    { id: "ACC-B", role: "SystemAdministrator", status: "Active" },
    { id: "ACC-N", role: "Nurse", status: "Active" },
  ];

  it("allows disabling one of two active admins", () => {
    expect(removesLastAdmin(twoAdmins, "ACC-A", { kind: "Disable" })).toBe(false);
  });

  it("blocks disabling the only active admin", () => {
    const oneLeft = twoAdmins.map((account) => (account.id === "ACC-B" ? { ...account, status: "Disabled" as const } : account));
    expect(removesLastAdmin(oneLeft, "ACC-A", { kind: "Disable" })).toBe(true);
  });

  it("blocks moving the only active admin to another role", () => {
    const oneAdmin = twoAdmins.filter((account) => account.id !== "ACC-B");
    expect(removesLastAdmin(oneAdmin, "ACC-A", { kind: "RoleChange", newRole: "Nurse" })).toBe(true);
  });

  it("doesn't care about non-admin accounts", () => {
    const oneAdmin = twoAdmins.filter((account) => account.id !== "ACC-B");
    expect(removesLastAdmin(oneAdmin, "ACC-N", { kind: "Disable" })).toBe(false);
  });

  it("allows a role change that keeps them an admin", () => {
    const oneAdmin = twoAdmins.filter((account) => account.id !== "ACC-B");
    expect(removesLastAdmin(oneAdmin, "ACC-A", { kind: "RoleChange", newRole: "SystemAdministrator" })).toBe(false);
  });
});

describe("second administrator approval (UC-08)", () => {
  const request = { requestedById: "EMP-A", targetStaffId: "EMP-T" };

  it("a different admin can approve", () => {
    expect(canDecide(request, "EMP-B", "Approved")).toBeNull();
  });

  it("the requester can't approve their own request", () => {
    expect(canDecide(request, "EMP-A", "Approved")).toMatch(/own request/);
  });

  it("the requester can withdraw (reject) their own request", () => {
    expect(canDecide(request, "EMP-A", "Rejected")).toBeNull();
  });

  it("nobody decides on their own account", () => {
    expect(canDecide(request, "EMP-T", "Approved")).toMatch(/own account/);
    expect(canDecide(request, "EMP-T", "Rejected")).toMatch(/own account/);
  });
});

describe("account details", () => {
  it("masks the email the access key went to", () => {
    expect(maskEmail("amendoza@wahter.local")).toBe("a*******@wahter.local");
    expect(maskEmail("ab@x.ph")).toBe("a***@x.ph");
  });

  it("accepts usernames like the seeded ones and refuses odd ones", () => {
    for (const ok of ["amendoza", "demo.physician", "j-pascual2"]) expect(USERNAME_PATTERN.test(ok)).toBe(true);
    for (const bad of ["ab", "Amendoza", "a b", ".start", "x".repeat(33)]) expect(USERNAME_PATTERN.test(bad)).toBe(false);
  });
});
