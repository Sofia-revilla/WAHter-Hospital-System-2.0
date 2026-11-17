import { apiGet, apiPost, apiRequest, setSession, type Session } from "@/lib/api";
import type { Provider, StaffRole } from "@/types";

// Calls to the Access & Provider Registry (services/access-provider-registry/backend)

// ─── signing in: password, then the emailed access key ───

export interface AccessKeyChallenge {
  challengeId: string;
  // masked, e.g. "a*******@wahter.local"; null when the code was handed out
  // with the link instead of emailed (the hosted preview)
  sentTo: string | null;
  delivery?: "email" | "given";
  codeLength?: number;
  expiresInSeconds: number;
}

// The server answers with a challenge (check your email), or, when the access
// key is turned off on the server, with the session itself
export type LoginAnswer = { signedIn: Session["user"] } | { challenge: AccessKeyChallenge };

export async function startLogin(role: StaffRole, username: string, password: string): Promise<LoginAnswer> {
  const answer = await apiPost<AccessKeyChallenge | Session>("access-provider-registry", "/auth/login", {
    role,
    username,
    password,
  });
  if ("accessToken" in answer) {
    setSession(answer);
    return { signedIn: answer.user };
  }
  return { challenge: answer };
}

export async function verifyAccessKey(challengeId: string, code: string) {
  const session = await apiPost<Session>("access-provider-registry", "/auth/verify", { challengeId, code });
  setSession(session);
  return session.user;
}

// Try Demo; the server refuses unless demo accounts are turned on
export async function demoLogin(role: StaffRole) {
  const session = await apiPost<Session>("access-provider-registry", "/auth/demo", { role });
  setSession(session);
  return session.user;
}

// US-41: sign-outs are audited, so the server hears about them
export const logout = () => apiPost<void>("access-provider-registry", "/auth/logout", {});

// ─── Users and Roles (System Administrator, UC-08) ───

export interface AccountRecord {
  id: string;
  staffId: string;
  username: string;
  email: string;
  name: string;
  role: StaffRole;
  department: string;
  license: string | null;
  status: "Active" | "Disabled";
  isLocked: boolean;
  failedAttempts: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  kind: "RoleChange" | "Disable";
  accountId: string;
  newRole: StaffRole | null;
  fromRole: StaffRole | null;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  requestedById: string;
  requestedAt: string;
  decidedById: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface NewAccount {
  name: string;
  role: StaffRole;
  department: string;
  license?: string;
  username: string;
  email: string;
  temporaryPassword: string;
}

export const fetchAccounts = () => apiGet<AccountRecord[]>("access-provider-registry", "/accounts");

export const createAccount = (account: NewAccount) =>
  apiPost<AccountRecord>("access-provider-registry", "/accounts", account);

export const updateAccount = (
  id: string,
  changes: { name?: string; department?: string; license?: string | null; email?: string },
) =>
  apiRequest<AccountRecord>("access-provider-registry", `/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

export const unlockAccount = (id: string) => apiPost<AccountRecord>("access-provider-registry", `/accounts/${id}/unlock`, {});

export const restoreAccount = (id: string) => apiPost<AccountRecord>("access-provider-registry", `/accounts/${id}/restore`, {});

export const requestApproval = (
  id: string,
  request: { kind: "RoleChange" | "Disable"; newRole?: StaffRole; reason: string },
) => apiPost<ApprovalRecord>("access-provider-registry", `/accounts/${id}/approval-requests`, request);

export const fetchApprovals = (status?: ApprovalRecord["status"]) =>
  apiGet<ApprovalRecord[]>("access-provider-registry", status ? `/approval-requests?status=${status}` : "/approval-requests");

export const decideApproval = (id: string, decision: "approve" | "reject", note?: string) =>
  apiPost<ApprovalRecord>("access-provider-registry", `/approval-requests/${id}/${decision}`, { note });

// The provider registry: how a provider ID on an order or admission becomes a name
export const fetchProviders = (role?: StaffRole) =>
  apiGet<Provider[]>("access-provider-registry", role ? `/providers?role=${role}` : "/providers");
