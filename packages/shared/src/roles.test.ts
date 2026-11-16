import { describe, expect, it } from "vitest";
import { ROLE_ALIASES, ROLE_LABELS, STAFF_ROLES, isStaffRole } from "./roles";

describe("roles from the use case diagram", () => {
  it("has the nine roles, each with a label", () => {
    expect(STAFF_ROLES).toHaveLength(9);
    for (const role of STAFF_ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
  });

  it("treats the paper's older names as the same roles", () => {
    expect(ROLE_ALIASES["Patient Registrar"]).toBe("AdmittingClerk");
    expect(ROLE_ALIASES.Doctor).toBe("Physician");
  });

  it("recognises only real role keys", () => {
    expect(isStaffRole("Nurse")).toBe(true);
    expect(isStaffRole("IT")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});
