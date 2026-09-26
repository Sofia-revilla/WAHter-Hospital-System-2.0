import type { StaffRole } from "@/types";

// Shared plumbing for the per-service API clients in services/<name>/frontend/api.ts.
// Talks to the services through the gateway (nginx -> Kong -> service).
// NEXT_PUBLIC_API_URL is "/api" inside Docker Compose. When it's unset, as on
// the Vercel preview, isApiMode is false and every screen keeps using the
// mock data in constants.ts, so the hosted demo works without a backend.

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export const isApiMode = API_URL !== "";

export type ServiceName =
  | "identity"
  | "clinical-records"
  | "scheduling"
  | "orders-diagnostics"
  | "billing"
  | "interoperability"
  | "notifications"
  | "audit-log";

export const SERVICE_NAMES: ServiceName[] = [
  "identity",
  "clinical-records",
  "scheduling",
  "orders-diagnostics",
  "billing",
  "interoperability",
  "notifications",
  "audit-log",
];

export interface SessionUser {
  id: string;
  name: string;
  role: StaffRole;
}

export interface Session {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
  }
}

// Kept in memory only. A page reload signs you out, same as the mock login;
// we didn't want tokens sitting in localStorage on a shared ward PC.
let session: Session | null = null;

export function currentSession() {
  return session;
}

export function setSession(next: Session) {
  session = next;
}

export function clearSession() {
  session = null;
}

// Nest puts validation errors in `message` as an array; show the first one
function messageFrom(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return String(message[0]);
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function send(service: ServiceName, path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_URL}/${service}${path}`, { ...init, headers });
}

async function refreshSession() {
  if (!session) return false;
  const response = await send(
    "identity",
    "/auth/refresh",
    { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) },
    null,
  );
  if (!response.ok) {
    session = null;
    return false;
  }
  session = (await response.json()) as Session;
  return true;
}

export async function apiRequest<T>(service: ServiceName, path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(service, path, init, session?.accessToken ?? null);

  // access tokens last 8h; one silent refresh before giving up
  if (response.status === 401 && session && (await refreshSession())) {
    response = await send(service, path, init, session!.accessToken);
  }

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(body, `Request failed (${response.status})`), body);
  }
  return body as T;
}

export const apiGet = <T>(service: ServiceName, path: string) => apiRequest<T>(service, path);

export const apiPost = <T>(service: ServiceName, path: string, payload: unknown) =>
  apiRequest<T>(service, path, { method: "POST", body: JSON.stringify(payload) });

// "3m ago" style labels for lists that used to have hardcoded strings
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
