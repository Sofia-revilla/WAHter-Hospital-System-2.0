// WAHter — ArchitectureStatusView.tsx
// IT Admin's architecture monitor, matching the paper's stack (TABLE IX):
// Nginx → Kong → 8 NestJS services, RabbitMQ, PostgreSQL schema-per-service,
// Docker Compose. No patient data on this screen (IT portal, RA 10173).
// With the Docker Compose stack running, the service, bus, and database
// cards come from each service's live /health. On the offline Vercel
// preview they're simulated, like the RBAC sandbox and event bus demo below.
// This tab lives in the web shell, not a service folder: it watches all eight.

"use client";

import { useEffect, useRef, useState } from "react";
import { Power, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, isApiMode, SERVICE_NAMES, type ServiceName } from "@/lib/api";

const HEALTH_POLL_MS = 10_000;

interface ServiceHealth {
  service: string;
  status: "up" | "degraded";
  database: "up" | "down";
  eventBus: "up" | "reconnecting";
}

// null means the /health call itself failed (container down or unreachable)
type HealthMap = Record<ServiceName, ServiceHealth | null>;

async function checkAllServices(): Promise<HealthMap> {
  const results = await Promise.allSettled(
    SERVICE_NAMES.map((name) => apiGet<ServiceHealth>(name, "/health")),
  );
  return Object.fromEntries(
    SERVICE_NAMES.map((name, index) => {
      const result = results[index];
      return [name, result.status === "fulfilled" ? result.value : null];
    }),
  ) as HealthMap;
}

type SandboxRole = "GUEST" | "NURSE" | "DOCTOR";
type SandboxTab = "rbac" | "schemas";
type LogType = "info" | "warn" | "success" | "err";

interface LogEntry {
  id: number;
  time: string;
  type: LogType;
  message: string;
}

// ─── SIMULATION DATA ───

const MAX_LOGS = 10;
const REQUEST_DELAY_MS = 800;

const INITIAL_LOGS: LogEntry[] = [
  { id: 1, time: "04:28:15", type: "info", message: "docker compose up: 13 containers on network wah-net" },
  { id: 2, time: "04:28:17", type: "success", message: "postgres: 8 service schemas ready, one DB user each" },
  { id: 3, time: "04:28:18", type: "success", message: "rabbitmq: topic exchange wah.events declared (with DLQ)" },
  { id: 4, time: "04:28:20", type: "success", message: "kong: DB-less config loaded, 8 routes under /api/*" },
];

// Demo tokens only. The payload part decodes to a harmless name/role claim
// and the "signature" is a placeholder string, not a real key.
const ROLE_TOKENS: Record<SandboxRole, string> = {
  GUEST:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR3Vlc3QgT3BlcmF0b3IiLCJyb2xlIjoiR3Vlc3QifQ.none",
  NURSE:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiU2FyYWggSm9obnNvbiIsInJvbGUiOiJOdXJzZSIsImRlcHQiOiJUcmlhZ2UifQ.validated_wah",
  DOCTOR:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9uYXRoYW4gU21pdGgiLCJyb2xlIjoiRG9jdG9yIiwiZGVwdCI6IkNhcmRpbyJ9.validated_signed_rsa",
};

interface SandboxEndpoint {
  id: string;
  label: string;
  path: string;
  service: string;
  schema: string;
  allowed: SandboxRole[];
  useCase: string;
}

// The allowed roles mirror the paper's use case actors
const ENDPOINTS: SandboxEndpoint[] = [
  {
    id: "vitals",
    label: "Chart vital signs",
    path: "POST /api/clinical-records/vitals",
    service: "clinical-records",
    schema: "clinical",
    allowed: ["NURSE", "DOCTOR"],
    useCase: "UC-05",
  },
  {
    id: "prescribe",
    label: "Prescribe medication",
    path: "POST /api/orders-diagnostics/medication-orders",
    service: "orders-diagnostics",
    schema: "orders",
    allowed: ["DOCTOR"],
    useCase: "UC-09",
  },
  {
    id: "soa",
    label: "Generate statement of account",
    path: "POST /api/billing/soa",
    service: "billing",
    schema: "billing",
    allowed: [],
    useCase: "UC-12, Billing Staff only",
  },
];

// One row per Functional Service Area (paper TABLE IV), each with its own
// schema and DB user and no cross-schema foreign keys
const SERVICE_SCHEMAS = [
  {
    service: "identity",
    schema: "identity",
    owns: "staff, patients (MPI)",
    publishes: "staff.logged-in, patient.registered",
  },
  {
    service: "clinical-records",
    schema: "clinical",
    owns: "patients (copy), encounters, vitals",
    publishes: "vitals.recorded, mews.alert.medium, mews.alert.high",
  },
  {
    service: "scheduling",
    schema: "scheduling",
    owns: "wards, admissions (bed lock)",
    publishes: "patient.admitted, patient.transferred",
  },
  {
    service: "orders-diagnostics",
    schema: "orders",
    owns: "formulary, medication_orders, diagnostic_orders",
    publishes: "medication.ordered, diagnostic.ordered",
  },
  {
    service: "billing",
    schema: "billing",
    owns: "charge_master, charges",
    publishes: "charge.posted",
  },
  {
    service: "interoperability",
    schema: "interop",
    owns: "patients, admissions (copies), report_runs",
    publishes: "report.generated",
  },
  { service: "notifications", schema: "notifications", owns: "alerts", publishes: "alert.acknowledged" },
  { service: "audit-log", schema: "audit", owns: "entries (append-only)", publishes: "(consumes every event)" },
];

const LOG_BADGE: Record<LogType, string> = {
  info: "bg-blue-500/15 text-blue-500",
  warn: "bg-amber-500/15 text-amber-600",
  success: "bg-emerald-500/15 text-emerald-600",
  err: "bg-red-500/15 text-red-500",
};

function currentTime() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

// ─── SERVICE CARDS ───

interface ServiceCardProps {
  label: string;
  labelClass: string;
  borderClass: string;
  status: string;
  isDown?: boolean;
  name: string;
  sub: string;
  footer: string;
}

function ServiceCard({
  label,
  labelClass,
  borderClass,
  status,
  isDown,
  name,
  sub,
  footer,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "glass flex min-h-[160px] flex-col justify-between rounded-xl border-l-4 p-5",
        borderClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-[10px] font-black uppercase tracking-widest", labelClass)}>
          {label}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-black uppercase",
            isDown ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600",
          )}
        >
          {status}
        </span>
      </div>
      <div className="my-3">
        <p className="font-bold">{name}</p>
        <p className="text-xs text-text-muted">{sub}</p>
      </div>
      <p
        className={cn(
          "border-t border-glass-border pt-2",
          "font-mono text-[9px] uppercase text-text-muted",
        )}
      >
        {footer}
      </p>
    </div>
  );
}

// ─── MAIN VIEW ───

export function ArchitectureStatusView() {
  const [selectedRole, setSelectedRole] = useState<SandboxRole>("GUEST");
  const [endpointId, setEndpointId] = useState(ENDPOINTS[0].id);
  const [activeTab, setActiveTab] = useState<SandboxTab>("rbac");
  const [isRequesting, setIsRequesting] = useState(false);
  const [lastRoute, setLastRoute] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  // event bus simulation
  const [isNotificationsUp, setIsNotificationsUp] = useState(true);
  const [liveHealth, setLiveHealth] = useState<HealthMap | null>(null);

  useEffect(() => {
    if (!isApiMode) return;
    let cancelled = false;
    const poll = () =>
      checkAllServices().then((health) => {
        if (!cancelled) setLiveHealth(health);
      });
    void poll();
    const timer = setInterval(() => void poll(), HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const liveEntries = liveHealth ? SERVICE_NAMES.map((name) => [name, liveHealth[name]] as const) : [];
  const upCount = liveEntries.filter(([, health]) => health?.status === "up").length;
  const failing = liveEntries.filter(([, health]) => health?.status !== "up").map(([name]) => name);
  const busDown = liveEntries.some(([, health]) => health && health.eventBus !== "up");
  const databaseDown = liveEntries.some(([, health]) => !health || health.database !== "up");
  const [published, setPublished] = useState(128);
  const [delivered, setDelivered] = useState(128);
  const [waiting, setWaiting] = useState(0);

  const nextLogId = useRef(INITIAL_LOGS.length + 1);
  const logListRef = useRef<HTMLUListElement>(null);
  // pending setTimeouts, cleared on unmount so leaving the tab mid-request
  // doesn't set state on an unmounted component
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  // keep the newest log in view, like tailing a container log
  useEffect(() => {
    logListRef.current?.scrollTo({ top: logListRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const endpoint = ENDPOINTS.find((candidate) => candidate.id === endpointId) ?? ENDPOINTS[0];

  function addLog(type: LogType, message: string) {
    const entry: LogEntry = { id: nextLogId.current++, time: currentTime(), type, message };
    setLogs((current) => [...current, entry].slice(-MAX_LOGS));
  }

  function later(callback: () => void, delay: number) {
    timers.current.push(window.setTimeout(callback, delay));
  }

  function selectRole(role: SandboxRole) {
    setSelectedRole(role);
    addLog("info", `Sandbox token swapped to role [${role}]`);
  }

  function sendRequest() {
    const role = selectedRole;
    const target = endpoint;

    setIsRequesting(true);
    setLastRoute(null);
    addLog("info", `nginx → kong: ${target.path}`);

    later(() => {
      setIsRequesting(false);

      if (role === "GUEST") {
        addLog("err", "kong: 401 Unauthorized, no valid JWT on the request");
        setLastRoute("Stopped at Kong (401)");
        return;
      }

      addLog("info", `kong: JWT ok, routed to ${target.service}`);
      if (!target.allowed.includes(role)) {
        addLog("warn", `${target.service}: role guard rejected [${role}] (${target.useCase})`);
        addLog("err", "HTTP 403 Forbidden");
        setLastRoute(`Kong → ${target.service} (403 at the role guard)`);
        return;
      }

      addLog("success", `${target.service}: wrote to schema "${target.schema}", 201 Created`);
      setLastRoute(`Kong → ${target.service} → PostgreSQL (${target.schema} schema)`);
    }, REQUEST_DELAY_MS);
  }

  function publishTestEvent() {
    setPublished((count) => count + 1);
    if (isNotificationsUp) {
      setDelivered((count) => count + 1);
      addLog("success", "wah.events: vitals.recorded → notifications, audit-log (delivered)");
    } else {
      setWaiting((count) => count + 1);
      addLog("warn", "notifications is down: vitals.recorded is waiting in its queue");
      addLog("success", "clinical-records kept working, vitals were still saved (fault isolation)");
    }
  }

  function toggleNotifications() {
    if (isNotificationsUp) {
      setIsNotificationsUp(false);
      addLog("warn", "docker: notifications container stopped (simulated failure)");
      return;
    }
    setIsNotificationsUp(true);
    addLog("info", "docker: notifications container started");
    if (waiting > 0) {
      addLog("success", `notifications: caught up on ${waiting} queued event(s)`);
      setDelivered((count) => count + waiting);
      setWaiting(0);
    }
  }

  const services: ServiceCardProps[] = [
    {
      label: "Web Frontend",
      labelClass: "text-[#a855f7]",
      borderClass: "border-l-foreground",
      status: "Online",
      name: "Next.js",
      sub: "Role-based portals",
      footer: "Port 3000 • talks to the gateway only",
    },
    {
      label: "Reverse Proxy",
      labelClass: "text-slate-500",
      borderClass: "border-l-slate-400",
      status: "Online",
      name: "Nginx",
      sub: "Single entry point",
      footer: "Port 80 • forwards /api to Kong",
    },
    {
      label: "API Gateway",
      labelClass: "text-wah-neon",
      borderClass: "border-l-wah-purple",
      status: "Active",
      name: "Kong (DB-less)",
      sub: "JWT check, rate limits, CORS",
      footer: "Port 8000 • 8 routes",
    },
    {
      label: "Microservices",
      labelClass: "text-rose-500",
      borderClass: "border-l-rose-500",
      status: liveHealth ? `${upCount} / 8 up` : isNotificationsUp ? "8 / 8 up" : "7 / 8 up",
      isDown: liveHealth ? upCount < 8 : !isNotificationsUp,
      name: "NestJS × 8 FSAs",
      sub: "One container per service",
      footer: liveHealth
        ? failing.length === 0
          ? "All /health checks OK (live)"
          : `${failing.join(", ")} /health failing`
        : isNotificationsUp
          ? "All /health checks OK"
          : "notifications /health failing",
    },
    {
      label: "Event Bus",
      labelClass: "text-orange-500",
      borderClass: "border-l-orange-500",
      status: liveHealth && busDown ? "Reconnecting" : "Running",
      isDown: Boolean(liveHealth && busDown),
      name: "RabbitMQ",
      sub: "Topic exchange wah.events",
      footer: `Queued: ${waiting} • DLQ: 0`,
    },
    {
      label: "Database",
      labelClass: "text-amber-600",
      borderClass: "border-l-amber-500",
      status: liveHealth && databaseDown ? "Degraded" : "Connected",
      isDown: Boolean(liveHealth && databaseDown),
      name: "PostgreSQL",
      sub: "Schema per service",
      footer: "8 schemas • 8 DB users",
    },
    {
      label: "Orchestrator",
      labelClass: "text-blue-500",
      borderClass: "border-l-blue-500",
      status: "Running",
      name: "Docker Compose",
      sub: "Local deployment",
      footer: isNotificationsUp ? "13 / 13 containers" : "12 / 13 containers",
    },
  ];

  const roleButton = (role: SandboxRole) =>
    cn(
      "flex-1 rounded-lg border px-3 py-2 text-xs font-black transition-colors",
      selectedRole === role
        ? "border-wah-purple bg-wah-purple text-white"
        : "border-glass-border bg-background/40 text-text-secondary hover:text-foreground",
    );

  const sandboxTab = (tab: SandboxTab) =>
    cn(
      "border-b-2 pb-3 text-sm font-bold transition-colors",
      activeTab === tab
        ? "border-wah-neon text-wah-neon"
        : "border-transparent text-text-muted hover:text-foreground",
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Active System Architecture Monitor</p>
        <h2 className="text-2xl font-bold tracking-tight">Infrastructure Stack Panel</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {services.map((service) => (
          <ServiceCard key={service.name} {...service} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <section className="glass rounded-xl p-5">
            <div className="mb-6 flex flex-wrap gap-6 border-b border-glass-border" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "rbac"}
                onClick={() => setActiveTab("rbac")}
                className={sandboxTab("rbac")}
              >
                JWT &amp; RBAC Tester
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "schemas"}
                onClick={() => setActiveTab("schemas")}
                className={sandboxTab("schemas")}
              >
                Service Schemas
              </button>
            </div>

            {activeTab === "rbac" ? (
              <div className="space-y-6">
                <p className="text-xs font-black uppercase tracking-widest text-[#d8b4fe]">
                  Role-Based Access Sandbox
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Simulated user token role
                    </p>
                    <div className="flex gap-2">
                      {(["GUEST", "NURSE", "DOCTOR"] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          aria-pressed={selectedRole === role}
                          onClick={() => selectRole(role)}
                          className={roleButton(role)}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Endpoint
                    </span>
                    <select
                      value={endpointId}
                      onChange={(event) => setEndpointId(event.target.value)}
                      className={cn(
                        "w-full rounded-lg border border-glass-border bg-glass-bg px-3 py-2",
                        "text-sm text-foreground outline-none focus:border-wah-purple",
                      )}
                    >
                      {ENDPOINTS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} ({option.useCase})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-wah-neon">
                    Bearer token sent with the request:
                  </p>
                  <p className="mt-2 break-all font-mono text-[10px] text-slate-300">
                    {ROLE_TOKENS[selectedRole]}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={sendRequest}
                    disabled={isRequesting}
                    className={cn(
                      "rounded-lg bg-wah-purple px-8 py-3.5 text-sm font-bold text-white shadow-lg",
                      "transition-all hover:scale-105 hover:bg-wah-neon active:scale-95",
                      "disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100",
                    )}
                  >
                    Send <code>{endpoint.path}</code>
                  </button>
                  {lastRoute && (
                    <span
                      className={cn(
                        "rounded-full bg-wah-neon/10 px-3 py-1.5",
                        "font-mono text-[10px] font-bold uppercase text-wah-neon",
                      )}
                    >
                      Route: {lastRoute}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-text-muted">
                  One PostgreSQL instance, one schema and one database user per service. Services
                  never query each other&apos;s schema; they share data through events on the bus.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr
                        className={cn(
                          "border-b border-glass-border",
                          "text-[10px] font-bold uppercase tracking-widest text-text-muted",
                        )}
                      >
                        <th className="pb-3">Service</th>
                        <th className="pb-3">Schema</th>
                        <th className="pb-3">Owns</th>
                        <th className="pb-3">Publishes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SERVICE_SCHEMAS.map((row) => (
                        <tr key={row.service} className="border-b border-glass-border/50">
                          <td className="py-2.5 pr-4 font-semibold">{row.service}</td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-wah-neon">{row.schema}</td>
                          <td className="py-2.5 pr-4 text-xs text-text-muted">{row.owns}</td>
                          <td className="py-2.5 font-mono text-[11px] text-text-muted">
                            {row.publishes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="glass rounded-xl border-l-4 border-l-orange-500/50 p-5">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Event Bus (RabbitMQ)</h3>
                <p className="max-w-md text-sm text-text-muted">
                  Stop the Notifications service and publish an event: vitals still save, and the
                  event waits in the queue until the service comes back.
                </p>
                <div className="grid grid-cols-3 gap-4 font-mono text-[10px] uppercase text-text-muted">
                  <p>
                    Published: <span className="text-foreground">{published}</span>
                  </p>
                  <p>
                    Delivered: <span className="text-foreground">{delivered}</span>
                  </p>
                  <p>
                    Waiting: <span className="text-foreground">{waiting}</span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={publishTestEvent}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg bg-wah-purple px-5 py-3",
                    "text-xs font-black uppercase tracking-widest text-white hover:bg-wah-neon",
                  )}
                >
                  <Send size={14} /> Publish vitals.recorded
                </button>
                <button
                  type="button"
                  onClick={toggleNotifications}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-5 py-3",
                    "text-xs font-black uppercase tracking-widest transition-colors",
                    isNotificationsUp
                      ? "border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                  )}
                >
                  <Power size={14} />
                  {isNotificationsUp ? "Stop Notifications" : "Start Notifications"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Docker Compose Logs</h3>
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full",
                  "animate-ping bg-emerald-400 opacity-75",
                )}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          <ul
            ref={logListRef}
            aria-live="polite"
            className="max-h-[480px] space-y-2 overflow-y-auto font-mono text-[10px]"
          >
            {logs.map((log) => (
              <li key={log.id} className="flex gap-2">
                <span className="shrink-0 text-text-muted">[{log.time}]</span>
                <span
                  className={cn(
                    "h-fit shrink-0 rounded px-1 text-[8px] uppercase",
                    LOG_BADGE[log.type],
                  )}
                >
                  {log.type}
                </span>
                <span className="text-foreground">{log.message}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
