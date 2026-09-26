import { apiGet, apiPost, setSession, type Session } from "@/lib/api";
import type { StaffRole } from "@/types";

// Calls to the Identity service (services/identity/backend)

export async function login(role: StaffRole, name: string, password: string) {
  const session = await apiPost<Session>("identity", "/auth/login", { role, name, password });
  setSession(session);
  return session.user;
}

export async function signup(role: StaffRole, name: string, license: string, password: string) {
  const session = await apiPost<Session>("identity", "/auth/signup", { role, name, license, password });
  setSession(session);
  return session.user;
}

export interface StaffAccountResponse {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "Active" | "Deactivated";
  lastLoginAt: string | null;
}

// IT only (UC-16); the service never returns password hashes
export const fetchStaffAccounts = () => apiGet<StaffAccountResponse[]>("identity", "/staff");
