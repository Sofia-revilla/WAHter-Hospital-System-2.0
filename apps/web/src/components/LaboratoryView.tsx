"use client";

import { useState } from "react";
import { Activity, AlertTriangle, FlaskConical, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import type { LabTest } from "@/types";
import { StatCard } from "./StatCard";

type WorklistView = "queue" | "results";

const STAT_CARDS = [
  { title: "Pending Tests", value: "12", sub: "Lab Worklist", icon: FlaskConical, trend: "Busy" },
  { title: "Tests Processed", value: "48", sub: "Last 24 Hours", icon: Activity },
  {
    title: "Critical Results",
    value: "02",
    sub: "Notify Doctor",
    icon: AlertTriangle,
    trend: "Urgent",
  },
];

const SLOT_COUNT = 8;
// slots B-01..B-05 are in use; this becomes live analyzer status later
const OCCUPIED_SLOTS = 5;

// PROCESS walks a test one step along the lab's pipeline: picked up, then
// resulted. Completed tests stay put and only offer VIEW.
function nextStatus(status: LabTest["status"]): LabTest["status"] {
  if (status === "Pending") return "In-Progress";
  return "Completed";
}

export function LaboratoryView() {
  const { labTests, inventory } = useData();
  const [view, setView] = useState<WorklistView>("queue");
  // TODO(Phase 5): results come from Orders & Diagnostics; local copy so PROCESS can be demoed
  const [tests, setTests] = useState<LabTest[]>(labTests);

  const visibleTests = tests.filter((test) =>
    view === "queue" ? test.status !== "Completed" : test.status === "Completed",
  );
  const labSupplies = inventory.filter((item) => item.category !== "Medication");

  function processTest(testId: string) {
    setTests((current) =>
      current.map((test) =>
        test.id === testId ? { ...test, status: nextStatus(test.status) } : test,
      ),
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Laboratory Information System</p>
        <h2 className="text-3xl font-bold tracking-tight">Diagnostic Workflows</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-[2rem] p-8 xl:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-bold">Laboratory Worklist</h3>
            <div className="glass flex rounded-xl p-1" role="tablist" aria-label="Worklist view">
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
                return (
                  <li
                    key={test.id}
                    className={cn(
                      "group flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5",
                      "border border-glass-border bg-glass-bg transition-all hover:border-wah-purple/50",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
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
                      <button
                        type="button"
                        // TODO(Phase 9b): VIEW opens the released result report
                        onClick={isCompleted ? undefined : () => processTest(test.id)}
                        className={cn(
                          "rounded-xl bg-wah-purple px-5 py-2.5 text-[10px] font-black uppercase text-white",
                          "opacity-0 transition-all hover:bg-wah-neon",
                          "group-hover:opacity-100 group-focus-within:opacity-100",
                        )}
                      >
                        {isCompleted ? "View" : "Process"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-8 xl:col-span-4">
          <section className="glass rounded-[2rem] p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold">Testing Slots</h3>
              <span
                className={cn(
                  "rounded-full bg-wah-neon/10 px-2 py-0.5",
                  "text-[10px] font-black uppercase tracking-widest text-wah-neon",
                )}
              >
                Real-Time
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: SLOT_COUNT }, (_, index) => {
                const isOccupied = index < OCCUPIED_SLOTS;
                return (
                  <div
                    key={index}
                    aria-label={`Slot B-0${index + 1}: ${isOccupied ? "in use" : "free"}`}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border",
                      isOccupied
                        ? "border-wah-purple/50 bg-wah-purple/20 text-wah-purple"
                        : "border-glass-border bg-glass-bg text-text-muted",
                    )}
                  >
                    <Activity size={16} />
                    <span className="font-mono text-[10px]">B-0{index + 1}</span>
                  </div>
                );
              })}
            </div>

            <h4 className="mb-4 mt-8 font-bold">Lab Inventory</h4>
            <ul className="space-y-4">
              {labSupplies.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span className="shrink-0 font-mono text-xs text-text-muted">
                      {item.stock.toLocaleString()} {item.unit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-bg">
                    {/* fixed 70% per the design, until reagent levels come from a real source */}
                    <div
                      className={cn(
                        "h-full w-[70%] rounded-full bg-wah-neon",
                        "shadow-[0_0_8px_rgba(168,85,247,0.5)]",
                      )}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={cn(
                "glass mt-8 w-full rounded-xl py-3",
                "text-xs font-black uppercase tracking-widest text-text-muted hover:text-foreground",
              )}
            >
              Manage Reagents
            </button>
          </section>

          <section
            className={cn(
              "rounded-3xl border border-glass-border p-6",
              "bg-gradient-to-br from-indigo-500/10 to-wah-purple/10",
            )}
          >
            <h3 className="font-bold">Automated Calibration</h3>
            <p className="mt-2 text-sm text-text-muted">
              Hematology analyzer scheduled for maintenance in 48 hours.
            </p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-500">Status: Ready</span>
              <Settings size={16} className="text-text-muted" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
