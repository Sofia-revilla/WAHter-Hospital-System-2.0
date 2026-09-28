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

// How each service is named on screen
export const SERVICE_LABELS: Record<ServiceName, string> = {
  identity: "Identity",
  "clinical-records": "Clinical Records",
  scheduling: "Scheduling",
  "orders-diagnostics": "Orders & Diagnostics",
  billing: "Billing",
  interoperability: "Interoperability",
  notifications: "Notifications",
  "audit-log": "Audit Log",
};

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

  // true when the service itself is unreachable, not when it said no
  get isServiceDown() {
    return this.status === 0 || this.status >= 502;
  }
}

// Kong answers 502/503/504 when a service's container is stopped, and fetch
// throws when nginx or Kong themselves are gone. Either way the raw message
// ("An invalid response was received from the upstream server") means
// nothing to a nurse, so we say which service is down instead.
function unavailable(service: ServiceName, status: number) {
  return new ApiError(
    status,
    `${SERVICE_LABELS[service]} is unavailable right now. Nothing was saved; try again in a moment.`,
    null,
  );
}

// Kept in sessionStorage so a page refresh doesn't sign staff out. Not
// localStorage: closing the tab (or the browser) ends the session, which is
// what we want on a shared ward PC.
const SESSION_KEY = "wahter.session";

let session: Session | null = null;

function storeSession(next: Session | null) {
  try {
    if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // private mode or storage blocked: the session just won't survive a refresh
  }
}

// Called once on app start. Returns null if there's nothing (valid) saved.
export function restoreSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    session = saved ? (JSON.parse(saved) as Session) : null;
  } catch {
    session = null;
  }
  return session;
}

export function currentSession() {
  return session;
}

export function setSession(next: Session) {
  session = next;
  storeSession(next);
}

export function clearSession() {
  session = null;
  storeSession(null);
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

// Past this, a request counts as "service unavailable" rather than hanging
// the screen. Kong gives up on a stopped container well before this.
const REQUEST_TIMEOUT_MS = 10_000;

async function send(service: ServiceName, path: string, init: RequestInit, token: string | null) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_URL}/${service}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
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
    clearSession();
    return false;
  }
  setSession((await response.json()) as Session);
  return true;
}

export async function apiRequest<T>(service: ServiceName, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await send(service, path, init, session?.accessToken ?? null);

    // access tokens last 8h; one silent refresh before giving up
    if (response.status === 401 && session && (await refreshSession())) {
      response = await send(service, path, init, session!.accessToken);
    }
  } catch {
    throw unavailable(service, 0);
  }

  if (response.status >= 502) throw unavailable(service, response.status);

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // a proxy error page instead of JSON; the status code is enough below
  }
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(body, `Request failed (${response.status})`), body);
  }
  return body as T;
}

export const apiGet = <T>(service: ServiceName, path: string) => apiRequest<T>(service, path);

export const apiPost = <T>(service: ServiceName, path: string, payload: unknown) =>
  apiRequest<T>(service, path, { method: "POST", body: JSON.stringify(payload) });

// True if nginx and Kong answer at all, even if one service behind them is
// down. We ask three services for /health and any JSON reply counts (Kong's
// own 502 for a stopped service is JSON too). A dead tunnel or a laptop with
// Docker off gives network errors or a proxy's HTML error page instead.
// Real routes on purpose: Kong skips CORS on a path with no route, so the
// Vercel site couldn't read that reply at all.
const PROBE_SERVICES: ServiceName[] = ["scheduling", "notifications", "audit-log"];

export async function gatewayReachable() {
  if (!isApiMode) return false;
  const probes = PROBE_SERVICES.map(async (service) => {
    const response = await fetch(`${API_URL}/${service}/health`, { signal: AbortSignal.timeout(5000) });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("not the gateway");
  });
  try {
    await Promise.any(probes);
    return true;
  } catch {
    return false;
  }
}

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
