"use client";

import { useState, type FormEvent } from "react";
import { Activity, AlertTriangle, CheckCircle2, FlaskConical, ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import { useData } from "@/context/DataContext";
import type { LabTest, StaffRole } from "@/types";
import { StatCard } from "./StatCard";

type WorklistView = "queue" | "results";

// UC-11's business rules, shown to staff who can't process results themselves
const RELEASE_RULES = [
  "Results are validated by lab or radiology staff before release",
  "Unvalidated findings are never shown to the doctor as final",
  "Critical or abnormal findings are flagged on the result for follow-up",
  "Every result links back to exactly one order",
  "The ordering doctor is notified when a result is released",
];

// PROCESS walks a test one step along the lab's pipeline: picked up, then
// resulted. Only lab/radiology staff get the button (see lib/staff.ts).
function nextStatus(status: LabTest["status"]): LabTest["status"] {
  if (status === "Pending") return "In-Progress";
  return "Completed";
}

function twoDigits(count: number) {
  return String(count).padStart(2, "0");
}

interface OrderTestFormProps {
  onOrder: (test: LabTest) => void;
}

function OrderTestForm({ onOrder }: OrderTestFormProps) {
  const { patients } = useData();
  const [patientName, setPatientName] = useState("");
  const [testName, setTestName] = useState("");
  const [kind, setKind] = useState<"Laboratory" | "Radiology">("Laboratory");
  const [priority, setPriority] = useState<LabTest["priority"]>("Routine");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientName || !testName.trim()) {
      setMessage("Pick a patient and enter the test or procedure.");
      return;
    }
    const prefix = kind === "Laboratory" ? "LAB" : "RAD";
    // TODO(Phase 5): POST to Orders & Diagnostics; the id comes from the service then
    onOrder({
      id: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
      patient: patientName,
      test: testName.trim(),
      priority,
      status: "Pending",
      time: "just now",
    });
    setMessage(`Ordered ${testName.trim()} for ${patientName}.`);
    setTestName("");
  }

  const fieldClass = cn(
    "w-full rounded-lg border border-glass-border bg-glass-bg p-3 text-sm",
    "text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="glass space-y-4 rounded-xl p-5">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <Plus size={18} className="text-wah-neon" /> Order Test
      </h3>

      <select
        value={patientName}
        onChange={(event) => setPatientName(event.target.value)}
        aria-label="Patient"
        className={fieldClass}
      >
        <option value="">Select a patient…</option>
        {patients.map((patient) => (
          <option key={patient.id} value={patient.name}>
            {patient.name} ({patient.id})
          </option>
        ))}
      </select>

      <input
        value={testName}
        onChange={(event) => setTestName(event.target.value)}
        placeholder="e.g. Complete Blood Count, Chest X-ray"
        aria-label="Test or procedure"
        className={fieldClass}
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as "Laboratory" | "Radiology")}
          aria-label="Department"
          className={fieldClass}
        >
          <option value="Laboratory">Laboratory</option>
          <option value="Radiology">Radiology</option>
        </select>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as LabTest["priority"])}
          aria-label="Priority"
          className={fieldClass}
        >
          <option value="Routine">Routine</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      <button
        type="submit"
        className={cn(
          "w-full rounded-lg bg-wah-purple py-3 text-xs font-black uppercase text-white",
          "shadow-lg shadow-wah-purple/20 transition-colors hover:bg-wah-neon",
        )}
      >
        Send Order
      </button>
      {message && <p className="text-sm text-text-muted">{message}</p>}
    </form>
  );
}

interface LaboratoryViewProps {
  role: StaffRole;
}

export function LaboratoryView({ role }: LaboratoryViewProps) {
  const { labTests } = useData();
  const [view, setView] = useState<WorklistView>("queue");
  // TODO(Phase 5): results come from Orders & Diagnostics; local copy so orders show up right away
  const [tests, setTests] = useState<LabTest[]>(labTests);

  const canProcess = can(role, "processLabResult");
  const canOrder = can(role, "orderDiagnosticTest");

  const visibleTests = tests.filter((test) =>
    view === "queue" ? test.status !== "Completed" : test.status === "Completed",
  );
  const openCount = tests.filter((test) => test.status !== "Completed").length;
  const completedCount = tests.length - openCount;
  const urgentOpenCount = tests.filter(
    (test) => test.status !== "Completed" && test.priority === "Urgent",
  ).length;

  const statCards = [
    { title: "Pending Tests", value: twoDigits(openCount), sub: "Lab Worklist", icon: FlaskConical },
    {
      title: "Results Released",
      value: twoDigits(completedCount),
      sub: "Ready to review",
      icon: CheckCircle2,
    },
    {
      title: "Urgent Requests",
      value: twoDigits(urgentOpenCount),
      sub: "Still open",
      icon: AlertTriangle,
      trend: urgentOpenCount > 0 ? "Urgent" : undefined,
    },
  ];

  function processTest(testId: string) {
    setTests((current) =>
      current.map((test) =>
        test.id === testId ? { ...test, status: nextStatus(test.status) } : test,
      ),
    );
  }

  function addOrder(test: LabTest) {
    setTests((current) => [test, ...current]);
    setView("queue");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Laboratory Information System</p>
        <h2 className="text-2xl font-bold tracking-tight">Diagnostic Workflows</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Laboratory Worklist</h3>
              {!canProcess && (
                <p className="text-xs text-text-muted">
                  Results are processed and released by lab and radiology staff.
                </p>
              )}
            </div>
            <div className="glass flex rounded-lg p-1" role="tablist" aria-label="Worklist view">
              {(["queue", "results"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-colors",
                    view === option ? "bg-wah-purple text-white" : "text-text-muted hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {visibleTests.length === 0 ? (
            <div className="py-12 text-center text-text-muted">
              <FlaskConical size={32} className="mx-auto opacity-30" />
              <p className="mt-3 font-semibold text-foreground">
                {view === "queue" ? "Queue is clear" : "No released results yet"}
              </p>
              <p className="text-sm">
                {view === "queue"
                  ? "Every request has been processed."
                  : "Processed tests show up here once they're completed."}
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {visibleTests.map((test) => {
                const isCompleted = test.status === "Completed";
                // staff who can't process still get VIEW on released results
                const actionLabel = isCompleted ? "View" : canProcess ? "Process" : null;
                return (
                  <li
                    key={test.id}
                    className={cn(
                      "group flex flex-wrap items-center justify-between gap-4 rounded-xl p-5",
                      "border border-glass-border bg-glass-bg transition-all hover:border-wah-purple/50",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                          isCompleted
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-wah-purple/10 text-wah-neon",
                        )}
                      >
                        <Activity size={20} className="transition-transform group-hover:scale-110" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{test.test}</p>
                        <p className="text-xs text-text-muted">
                          {test.patient} · {test.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-xs uppercase",
                            test.priority === "Urgent" ? "font-black text-red-500" : "text-text-muted",
                          )}
                        >
                          {test.priority}
                        </p>
                        <p className="font-mono text-[10px] text-text-muted">{test.id}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-wah-purple/15 text-wah-neon",
                        )}
                      >
                        {test.status}
                      </span>
                      {actionLabel && (
                        <button
                          type="button"
                          // TODO(Phase 9b): VIEW opens the released result report
                          onClick={isCompleted ? undefined : () => processTest(test.id)}
                          className={cn(
                            "rounded-lg bg-wah-purple px-5 py-2.5 text-[10px] font-black uppercase text-white",
                            "opacity-0 transition-all hover:bg-wah-neon",
                            "group-hover:opacity-100 group-focus-within:opacity-100",
                          )}
                        >
                          {actionLabel}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-6 xl:col-span-4">
          {canOrder ? (
            <OrderTestForm onOrder={addOrder} />
          ) : (
            <section className="glass rounded-xl p-5">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <ListChecks size={18} className="text-wah-neon" /> Result Release Rules
              </h3>
              <ul className="space-y-3 text-sm text-text-muted">
                {RELEASE_RULES.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    {rule}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
