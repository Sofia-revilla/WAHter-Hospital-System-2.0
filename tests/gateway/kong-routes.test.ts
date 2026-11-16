// Kong must turn away a call with no token or the wrong role on every route
// (Phase 1 brief, OWASP A01). Reads the same route table Kong is generated
// from (infra/kong/routes.mjs) and calls each route three ways:
//   no token → 401, a role that isn't listed → 403, a listed role → let through.
// "Let through" means Kong passed it to the service: the service may still
// answer 400 or 404 for the empty test body, but never 401/403.
//
// Needs the stack running (docker compose up -d). Tokens are signed with the
// local JWT_SECRET from .env, the same way the Access & Provider Registry does.

import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
// plain JS module; it's the source of truth for both Kong and these tests
import { ROLES, ROUTES } from "../../infra/kong/routes.mjs";

const BASE = process.env.GATEWAY_URL ?? "http://localhost:8080";

interface Route {
  service: string;
  name: string;
  methods: string[];
  path: string;
  sample?: string;
  roles?: string[];
  internalOnly?: boolean;
}

function jwtSecret() {
  const env = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  const match = env.match(/^JWT_SECRET=(.+)$/m);
  if (!match) throw new Error("JWT_SECRET missing from .env");
  return match[1].trim();
}

const secret = jwtSecret();

function tokenFor(role: string) {
  return jwt.sign(
    { id: "EMP-GATEWAY-TEST", name: "Gateway Test", role, rk: `role-${role.toLowerCase()}`, kind: "access" },
    secret,
    { issuer: "wahter-access", subject: "EMP-GATEWAY-TEST", expiresIn: "5m" },
  );
}

function urlFor(route: Route) {
  return `${BASE}${route.sample ?? route.path}`;
}

async function call(route: Route, method: string, token?: string) {
  const response = await fetch(urlFor(route), {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
    },
    body: method === "GET" ? undefined : "{}",
  });
  return response.status;
}

const routes = ROUTES as Route[];
const roles = ROLES as string[];

describe.each(routes.filter((route) => !route.internalOnly))("$service $name ($path)", (route) => {
  const allowed = route.roles!;
  const denied = roles.filter((role) => !allowed.includes(role));

  it.each(route.methods)("%s with no token is 401", async (method) => {
    expect(await call(route, method)).toBe(401);
  });

  it.each(route.methods)("%s with a forged token is 401", async (method) => {
    const forged = jwt.sign({ role: allowed[0], rk: `role-${allowed[0].toLowerCase()}` }, "not-the-secret", {
      issuer: "wahter-access",
      expiresIn: "5m",
    });
    expect(await call(route, method, forged)).toBe(401);
  });

  it.each(route.methods)("%s with every role that isn't allowed is 403", async (method) => {
    for (const role of denied) {
      expect({ role, status: await call(route, method, tokenFor(role)) }).toEqual({ role, status: 403 });
    }
  });

  it.each(route.methods)("%s with an allowed role gets past Kong", async (method) => {
    for (const role of allowed) {
      const status = await call(route, method, tokenFor(role));
      expect({ role, passed: status !== 401 && status !== 403 }).toEqual({ role, passed: true });
    }
  });
});

describe("routes for other services only", () => {
  it.each(routes.filter((route) => route.internalOnly))("$path is closed to every role", async (route) => {
    for (const role of roles) expect(await call(route, "GET", tokenFor(role))).toBe(404);
  });
});

describe("paths nobody listed", () => {
  it("get Kong's 404, not a service", async () => {
    const response = await fetch(`${BASE}/api/audit-log/internal/gateway-log`, { method: "POST", body: "{}" });
    expect(response.status).toBe(404);
  });
});
