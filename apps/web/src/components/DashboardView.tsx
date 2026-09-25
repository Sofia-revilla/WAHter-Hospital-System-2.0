"use client";

import { Activity, Bed, FlaskConical, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { wardLabel } from "@/lib/beds";
import { MewsAlertsPanel } from "./MewsAlertsPanel";
import { PatientCard } from "./PatientCard";
import { PatientFlowChart } from "./PatientFlowChart";
import { StatCard } from "./StatCard";

function twoDigits(count: number) {
  return String(count).padStart(2, "0");
}

interface DashboardViewProps {
  isLight: boolean;
  // who acknowledges MEWS alerts from this dashboard
  staffName: string;
}

// Clinical dashboard for doctors and nurses. Revenue lives with Billing Staff
// and the Hospital Administrator (paper user classes), so it isn't here.
export function DashboardView({ isLight, staffName }: DashboardViewProps) {
  const { patients, wards, occupiedBeds, mewsAlerts, labTests } = useData();

  const activeAlerts = mewsAlerts.filter((alert) => !alert.acknowledgedAt);
  const highAlerts = activeAlerts.filter((alert) => alert.risk === "High").length;
  const totalBeds = wards.reduce((sum, ward) => sum + ward.capacity, 0);
  const takenBeds = wards.reduce((sum, ward) => sum + occupiedBeds(ward.id).length, 0);
  const occupancy = totalBeds === 0 ? 0 : Math.round((takenBeds / totalBeds) * 100);
  const pendingResults = labTests.filter((test) => test.status !== "Completed");
  const urgentResults = pendingResults.filter((test) => test.priority === "Urgent").length;

  // every card is counted from live data now, nothing hardcoded
  const statCards = [
    {
      title: "Admitted Patients",
      value: String(patients.length),
      sub: "Current inpatients",
      icon: Users,
    },
    {
      title: "Bed Occupancy",
      value: `${occupancy}%`,
      sub: `${takenBeds} of ${totalBeds} beds`,
      icon: Bed,
      trend: occupancy >= 85 ? "High" : undefined,
    },
    {
      title: "MEWS Alerts",
      value: twoDigits(activeAlerts.length),
      sub: activeAlerts.length > 0 ? "Requires attention" : "All acknowledged",
      icon: Activity,
      trend: highAlerts > 0 ? "Critical" : undefined,
    },
    {
      title: "Pending Results",
      value: twoDigits(pendingResults.length),
      sub: "Lab & radiology",
      icon: FlaskConical,
      trend: urgentResults > 0 ? `${urgentResults} urgent` : undefined,
    },
  ];

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wah-purple">{today}</p>
          <h2 className="text-2xl font-bold tracking-tight">Hospital Operations Center</h2>
          <p className="text-sm text-text-muted">Ward census, patient flow, and pending work.</p>
        </div>
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wah-neon opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-wah-neon" />
          </span>
          <span className="text-xs font-semibold text-text-muted">Connectivity: Optimal</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        {/* min-w-0: grid items default to min-width:auto, so a wide child could
            push the whole column wider than the screen on tablets */}
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <PatientFlowChart isLight={isLight} />

          {/* Replaced the old inventory watchlist: pharmacy is dispensing-only in the
              paper, and no service owns stock. Bed occupancy is in scope (UC-04, story 9). */}
          <section className="glass rounded-xl p-5">
            <div className="mb-4">
              <h3 className="font-bold">Bed Occupancy by Ward</h3>
              <p className="text-xs text-text-muted">Live from the bed board</p>
            </div>
            <ul className="space-y-4">
              {wards.map((ward) => {
                const taken = occupiedBeds(ward.id).length;
                const percent = ward.capacity === 0 ? 0 : Math.round((taken / ward.capacity) * 100);
                return (
                  <li key={ward.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">{wardLabel(ward)}</span>
                      <span className="shrink-0 font-mono text-xs text-text-muted">
                        {taken}/{ward.capacity} · {percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-bg">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          // one calm purple; only a nearly full ward stands out
                          percent >= 90 ? "bg-rose-400" : "bg-wah-purple/70",
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="min-w-0 space-y-4 xl:col-span-4">
          <MewsAlertsPanel staffName={staffName} />

          <div className="glass flex items-center justify-between rounded-xl px-4 py-2.5">
            <span className="text-sm font-bold">Active Cases</span>
            <span
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5",
                "bg-wah-purple text-sm font-bold text-white",
              )}
            >
              {patients.length}
            </span>
          </div>

          {/* capped height so the feed scrolls on its own instead of stretching the page */}
          <div className="hide-scrollbar max-h-[860px] space-y-3 overflow-y-auto pr-1">
            {patients.map((patient) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}

            <div
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-glass-border p-5",
                "text-text-muted",
              )}
            >
              <Plus size={20} />
              <span className="text-xs font-semibold">End of daily feed</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
