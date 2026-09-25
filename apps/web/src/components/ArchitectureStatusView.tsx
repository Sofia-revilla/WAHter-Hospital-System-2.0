// WAHter — ArchitectureStatusView.tsx
// IT Admin's architecture monitor: service status cards, an RBAC request
// sandbox, a JSONB record viewer, a cache panel, and a live log feed.
// Everything here is simulated for the prototype demo: no real requests,
// no real cache. TODO(Phase 9c): replace with live /health data from each
// service and the Audit Log transaction feed (see DECISIONS.md D-028).

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SandboxRole = "GUEST" | "NURSE" | "DOCTOR";
type SandboxTab = "interceptor" | "jsonb";
type PatientId = "WAH-2026-00001" | "WAH-2026-00002";
type FetchSource = "None" | "Database (Supabase PostgreSQL JSONB)" | "Cache (Redis Node)";
type LogType = "info" | "warn" | "success" | "err";

interface LogEntry {
  id: number;
  time: string;
  type: LogType;
  message: string;
}

interface CacheMetrics {
  hitRate: number;
  keysCount: number;
  memory: string;
}

// ─── SIMULATION DATA ───

const MAX_LOGS = 10;
const REQUEST_DELAY_MS = 800;
const FLUSH_DELAY_MS = 1200;
const CACHE_HIT_CHANCE = 0.4;

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 1,
    time: "04:28:18",
    type: "info",
    message: "Hospital Compose environment initialized on subnet 172.24.0.0/16",
  },
  {
    id: 2,
    time: "04:28:19",
    type: "success",
    message: "NestJS controller bindings parsed: POST /api/auth, GET /api/patients",
  },
  {
    id: 3,
    time: "04:28:20",
    type: "success",
    message: "Database connected. SSL handshake completed with Supabase cluster.",
  },
];

// Demo tokens only. The payload segments decode to harmless role/name claims
// and the "signatures" are placeholder strings, not real keys.
const ROLE_TOKENS: Record<SandboxRole, string> = {
  GUEST:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR3Vlc3QgT3BlcmF0b3IiLCJyb2xlIjoiR3Vlc3QifQ.none",
  NURSE:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiU2FyYWggSm9obnNvbiIsInJvbGUiOiJOdXJzZSIsImRlcHQiOiJUcmlhZ2UifQ.validated_wah",
  DOCTOR:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9uYXRoYW4gU21pdGgiLCJyb2xlIjoiRG9jdG9yIiwiZGVwdCI6IkNhcmRpbyJ9.validated_signed_rsa",
};

const PATIENT_NAMES: Record<PatientId, string> = {
  "WAH-2026-00001": "James Smith",
  "WAH-2026-00002": "Mary Johnson",
};

const VITALS_DATA: Record<PatientId, object> = {
  "WAH-2026-00001": {
    patientId: "WAH-2026-00001",
    name: "James Smith",
    clinicalData: {
      vitalsHistory: [
        { stamp: "2026-05-19T06:00:00Z", bp: "120/80", hr: 72, temp: 36.8, rr: 16 },
        { stamp: "2026-05-20T04:00:00Z", bp: "118/76", hr: 70, temp: 36.6, rr: 14 },
      ],
      pastHistory: ["Type-2 Diabetes", "Hypertension"],
      allergies: ["Penicillin"],
      unstructuredDoctorNotes:
        "Patient stable. MEWS score reflects consistent recovery. Scheduled discharge protocol phase 2.",
    },
  },
  "WAH-2026-00002": {
    patientId: "WAH-2026-00002",
    name: "Mary Johnson",
    clinicalData: {
      vitalsHistory: [
        { stamp: "2026-05-19T06:00:00Z", bp: "142/95", hr: 98, temp: 38.5, rr: 22 },
        { stamp: "2026-05-20T04:00:00Z", bp: "138/92", hr: 96, temp: 38.2, rr: 20 },
      ],
      pastHistory: ["Chronic Renal Insufficiency", "Asthma"],
      allergies: ["Sulfonamides", "Aspirin"],
      unstructuredDoctorNotes:
        "Persistent hyperpyrexia despite antipyretics. Started IV cephalosporins with renal dose adjustment; reassess in 24 hours.",
    },
  },
};

const LOG_BADGE: Record<LogType, string> = {
  info: "bg-blue-500/15 text-blue-400",
  warn: "bg-amber-500/15 text-amber-500",
  success: "bg-emerald-500/15 text-emerald-500",
  err: "bg-red-500/15 text-red-500",
};

function currentTime() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function parseMegabytes(memory: string) {
  return Number.parseFloat(memory) || 0;
}

// ─── SERVICE CARDS ───

interface ServiceCardProps {
  label: string;
  labelClass: string;
  borderClass: string;
  status: string;
  name: string;
  sub: string;
  footer: string;
}

function ServiceCard({
  label,
  labelClass,
  borderClass,
  status,
  name,
  sub,
  footer,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "glass flex min-h-[160px] flex-col justify-between rounded-2xl border-l-4 p-5",
        borderClass,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-[10px] font-black uppercase tracking-widest", labelClass)}>
          {label}
        </span>
        <span
          className={cn(
            "rounded-full bg-emerald-500/10 px-2 py-0.5",
            "text-[9px] font-black uppercase text-emerald-500",
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
  const [activeTab, setActiveTab] = useState<SandboxTab>("interceptor");
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>({
    hitRate: 98.4,
    keysCount: 18,
    memory: "1.25 MB",
  });
  const [selectedPatientId, setSelectedPatientId] = useState<PatientId>("WAH-2026-00001");
  const [dbFetchSource, setDbFetchSource] = useState<FetchSource>("None");
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  const nextLogId = useRef(INITIAL_LOGS.length + 1);
  const logListRef = useRef<HTMLUListElement>(null);
  // pending setTimeouts, cleared on unmount so switching tabs mid-request
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

  function addLog(type: LogType, message: string) {
    const entry: LogEntry = { id: nextLogId.current++, time: currentTime(), type, message };
    setLogs((current) => [...current, entry].slice(-MAX_LOGS));
  }

  function later(callback: () => void, delay: number) {
    timers.current.push(window.setTimeout(callback, delay));
  }

  function selectRole(role: SandboxRole) {
    setSelectedRole(role);
    addLog("info", `Simulated client login swapped to: Role [${role}]`);
  }

  function triggerMockApiRequest() {
    const role = selectedRole;
    const patientId = selectedPatientId;
    const token = ROLE_TOKENS[role];

    setIsRequesting(true);
    addLog("info", `Securing path [GET /api/patients/${patientId}/clinical-data]`);
    addLog("info", `Header attached: Authorization: Bearer ${token.slice(0, 24)}…`);

    later(() => {
      setIsRequesting(false);

      if (role === "GUEST") {
        setDbFetchSource("None");
        addLog("err", "HTTP 401 Unauthorized - No valid session token supplied");
        return;
      }

      if (role === "NURSE") {
        setDbFetchSource("None");
        addLog("warn", "RBAC guard rejected scope [clinical-data:read] for role [NURSE]");
        addLog("err", "HTTP 403 Forbidden - Role [NURSE] lacks permission for this resource");
        return;
      }

      const isCacheHit = cacheMetrics.keysCount > 0 && Math.random() < CACHE_HIT_CHANCE;

      if (isCacheHit) {
        setDbFetchSource("Cache (Redis Node)");
        setCacheMetrics((current) => ({
          ...current,
          hitRate: Math.min(current.hitRate + 0.2, 99.9),
        }));
        addLog("success", `Redis Cache HIT for key [patient:clinical:${patientId}]`);
      } else {
        setDbFetchSource("Database (Supabase PostgreSQL JSONB)");
        setCacheMetrics((current) =>
          current.keysCount === 0
            ? { hitRate: 15.2, keysCount: 1, memory: "0.15 MB" }
            : {
                ...current,
                keysCount: current.keysCount + 1,
                memory: `${(parseMegabytes(current.memory) + 0.08).toFixed(2)} MB`,
              },
        );
        addLog("success", "Redis Cache MISS. Directed query to SQL and cached the JSONB row");
      }

      addLog(
        "success",
        `HTTP 200 OK - Return structured clinical payload for ${PATIENT_NAMES[patientId]}`,
      );
    }, REQUEST_DELAY_MS);
  }

  function flushCache() {
    setIsFlushingCache(true);
    addLog("warn", "FLUSHALL issued to Redis node — evicting session keys");

    later(() => {
      setCacheMetrics({ hitRate: 0, keysCount: 0, memory: "0.00 MB" });
      setIsFlushingCache(false);
      addLog("success", "Redis cache buffer flushed. 0 keys remaining");
    }, FLUSH_DELAY_MS);
  }

  const services: ServiceCardProps[] = [
    {
      label: "Web Frontend",
      labelClass: "text-[#a855f7]",
      borderClass: "border-l-foreground",
      status: "Online",
      name: "Next.js Framework",
      sub: "Type-Safe Client Container",
      footer: "Port: 3000 • SSR & Hydration Status: OK",
    },
    {
      label: "REST Gateway",
      labelClass: "text-wah-neon",
      borderClass: "border-l-wah-purple",
      status: "Active",
      name: "NestJS Controller",
      sub: "Guard Interceptors Enabled",
      footer: "Port: 3001 • JWT Strategy: Verified",
    },
    {
      label: "PostgreSQL Engine",
      labelClass: "text-amber-500",
      borderClass: "border-l-amber-500",
      status: "Connected",
      name: "Supabase Database",
      sub: "Hybrid Tables + JSONB",
      footer: "Pool: 12/20 • DB Engine: v15.4",
    },
    {
      label: "Cache Cluster",
      labelClass: "text-red-500",
      borderClass: "border-l-red-500",
      status: "Ready",
      name: "Redis Node",
      sub: `Hit Matrix: ${cacheMetrics.hitRate.toFixed(1)}%`,
      footer: `Keys: ${cacheMetrics.keysCount} • Mem: ${cacheMetrics.memory}`,
    },
    {
      label: "Orchestrator",
      labelClass: "text-blue-500",
      borderClass: "border-l-blue-500",
      status: "Running",
      name: "Docker Compose",
      sub: "4 Container Pods Active",
      footer: "Subnet: 172.24.0.0/16 • CPU: 2.1%",
    },
  ];

  const roleButton = (role: SandboxRole) =>
    cn(
      "flex-1 rounded-xl border px-3 py-2 text-xs font-black transition-colors",
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
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Active System Architecture Monitor</p>
        <h2 className="text-3xl font-bold tracking-tight">Infrastructure Stack Panel</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {services.map((service) => (
          <ServiceCard key={service.name} {...service} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-12">
        <div className="min-w-0 space-y-8 xl:col-span-8">
          <section className="glass rounded-[2rem] p-8">
            <div className="mb-6 flex flex-wrap gap-6 border-b border-glass-border" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "interceptor"}
                onClick={() => setActiveTab("interceptor")}
                className={sandboxTab("interceptor")}
              >
                JWT &amp; RBAC Interceptors Tester
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "jsonb"}
                onClick={() => setActiveTab("jsonb")}
                className={sandboxTab("jsonb")}
              >
                PostgreSQL JSONB Column Viewer
              </button>
            </div>

            {activeTab === "interceptor" ? (
              <div className="space-y-6">
                <p className="text-xs font-black uppercase tracking-widest text-[#d8b4fe]">
                  Role-Based Access Sandbox
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Simulated User JWT Token Role
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
                      Target Directory Patient ID
                    </span>
                    <select
                      value={selectedPatientId}
                      onChange={(event) => setSelectedPatientId(event.target.value as PatientId)}
                      className={cn(
                        "w-full rounded-xl border border-glass-border bg-glass-bg px-3 py-2",
                        "text-sm text-foreground outline-none focus:border-wah-purple",
                      )}
                    >
                      <option value="WAH-2026-00001">James Smith (WAH-2026-00001)</option>
                      <option value="WAH-2026-00002">Mary Johnson (WAH-2026-00002)</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-wah-neon">
                    Generated Bearer JWT Signature Token:
                  </p>
                  <p className="mt-2 break-all font-mono text-[10px] text-slate-300">
                    {ROLE_TOKENS[selectedRole]}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={triggerMockApiRequest}
                    disabled={isRequesting}
                    className={cn(
                      "rounded-xl bg-wah-purple px-8 py-3.5 text-sm font-bold text-white shadow-lg",
                      "transition-all hover:scale-105 hover:bg-wah-neon active:scale-95",
                      "disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100",
                    )}
                  >
                    Send Restricted API Request (<code>GET /clinical-data</code>)
                  </button>
                  {dbFetchSource !== "None" && (
                    <span
                      className={cn(
                        "rounded-full bg-wah-neon/10 px-3 py-1.5",
                        "font-mono text-[10px] font-bold uppercase text-wah-neon",
                      )}
                    >
                      Fetch Path Source: {dbFetchSource}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#d8b4fe]">
                    PostgreSQL Hybrid Relational + JSONB Schema
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    Core identity fields (patient ID, name) live in ordinary relational columns so they
                    can be indexed and joined. Semi-structured clinical detail such as vitals history,
                    allergies and free-text notes sits in a single JSONB column on the same row, which
                    keeps the schema stable while the clinical data grows.
                  </p>
                </div>

                <div className="flex gap-2">
                  {(Object.keys(PATIENT_NAMES) as PatientId[]).map((patientId) => (
                    <button
                      key={patientId}
                      type="button"
                      aria-pressed={selectedPatientId === patientId}
                      onClick={() => setSelectedPatientId(patientId)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-xs font-bold transition-colors",
                        selectedPatientId === patientId
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-500"
                          : "border-glass-border text-text-muted hover:text-foreground",
                      )}
                    >
                      {PATIENT_NAMES[patientId]}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
                    SQL DB Record Row Mapping:
                  </p>
                  <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-300">
                    {JSON.stringify(VITALS_DATA[selectedPatientId], null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>

          <section className="glass rounded-[2rem] border-l-4 border-l-red-500/50 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Redis Caching (IOREDIS Service Layer)</h3>
                <div className="grid grid-cols-3 gap-4 font-mono text-[10px] uppercase text-text-muted">
                  <p>
                    Keys in session: <span className="text-foreground">{cacheMetrics.keysCount}</span>
                  </p>
                  <p>
                    Cache hit ratio:{" "}
                    <span className="text-foreground">{cacheMetrics.hitRate.toFixed(1)}%</span>
                  </p>
                  <p>
                    Allocated memory: <span className="text-foreground">{cacheMetrics.memory}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={flushCache}
                disabled={isFlushingCache}
                className={cn(
                  "shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3",
                  "text-xs font-black uppercase tracking-widest text-red-500",
                  "transition-colors hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-70",
                )}
              >
                {isFlushingCache ? "Flushing Ex…" : "Flush Redis Cache Buffer"}
              </button>
            </div>
          </section>
        </div>

        <section className="glass min-w-0 rounded-[2rem] p-8 xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Docker Compose Node Logs</h3>
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
