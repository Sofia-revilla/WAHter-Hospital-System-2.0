import { apiGet, apiPost, setSession, type Session } from "@/lib/api";
import type { Provider, StaffRole } from "@/types";

// Calls to the Access & Provider Registry (services/access-provider-registry/backend)

export async function login(role: StaffRole, name: string, password: string) {
  const session = await apiPost<Session>("access-provider-registry", "/auth/login", { role, name, password });
  setSession(session);
  return session.user;
}

export async function signup(role: StaffRole, name: string, license: string, password: string) {
  const session = await apiPost<Session>("access-provider-registry", "/auth/signup", {
    role,
    name,
    license,
    password,
  });
  setSession(session);
  return session.user;
}

export interface StaffAccountResponse {
  id: string;
  name: string;
  role: StaffRole;
  department: string;
  status: "Active" | "Deactivated";
  lastLoginAt: string | null;
}

// System Administrator only (UC-08); the service never returns password hashes
export const fetchStaffAccounts = () => apiGet<StaffAccountResponse[]>("access-provider-registry", "/staff");

// The provider registry: how a provider ID on an order or admission becomes a name
export const fetchProviders = (role?: StaffRole) =>
  apiGet<Provider[]>("access-provider-registry", role ? `/providers?role=${role}` : "/providers");
