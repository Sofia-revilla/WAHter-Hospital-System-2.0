import type { StaffRole } from "@wahter/shared";

// The UC-08 rules, kept as plain functions so they can be unit tested
// without a database. The services call these and the database constraints
// back them up.

// Five wrong passwords or access keys in a row locks the account until a
// System Administrator unlocks it. Five is the common default (e.g. OWASP's
// guidance on lockout thresholds); CDH can change it here.
export const MAX_FAILED_ATTEMPTS = 5;

// how long an emailed access key works, and how many tries it gets
export const ACCESS_KEY_TTL_MS = 5 * 60_000;
export const ACCESS_KEY_MAX_ATTEMPTS = 3;

export function shouldLock(failedAttempts: number) {
  return failedAttempts >= MAX_FAILED_ATTEMPTS;
}

export interface AccountSnapshot {
  id: string;
  role: StaffRole;
  status: "Active" | "Disabled";
}

// UC-08 extension 3a: the change would leave no active System Administrator.
// `change` is what the request would do to `targetId`.
export function removesLastAdmin(
  accounts: AccountSnapshot[],
  targetId: string,
  change: { kind: "Disable" } | { kind: "RoleChange"; newRole: StaffRole },
) {
  const target = accounts.find((account) => account.id === targetId);
  if (!target || target.role !== "SystemAdministrator" || target.status !== "Active") return false;
  if (change.kind === "RoleChange" && change.newRole === "SystemAdministrator") return false;
  const otherActiveAdmins = accounts.filter(
    (account) => account.id !== targetId && account.role === "SystemAdministrator" && account.status === "Active",
  );
  return otherActiveAdmins.length === 0;
}

// The second-admin rule: someone other than the requester approves, and
// nobody decides on a change to their own account. The requester may still
// reject (withdraw) their own request, so it doesn't sit pending forever
// when only two administrators exist.
export function canDecide(
  request: { requestedById: string; targetStaffId: string },
  deciderStaffId: string,
  decision: "Approved" | "Rejected",
) {
  if (deciderStaffId === request.targetStaffId) return "You can't decide on a change to your own account.";
  if (deciderStaffId === request.requestedById && decision === "Approved") {
    return "You can't approve your own request. Another System Administrator has to.";
  }
  return null;
}

// Usernames: lowercase letters, digits, dots, and dashes, 3 to 32 long
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9.-]{2,31}$/;

// "j*****@wahter.local", so the login screen can say where the key went
// without showing the whole address
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "your email";
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
