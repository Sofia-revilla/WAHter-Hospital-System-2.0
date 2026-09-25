"use client";

import { useState } from "react";
import { Activity, Bed, DollarSign, Plus, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { wardLabel } from "@/lib/beds";
import { REVENUE_DATA } from "@/constants";
import { MewsAlertsPanel } from "./MewsAlertsPanel";
import { PatientCard } from "./PatientCard";
import { StatCard } from "./StatCard";

// Recharts writes these straight into SVG attributes, where var(--…) doesn't
// resolve, so the chart gets literal hex values instead of our CSS tokens.
const CHART_PURPLE = "#6d28d9";
const CHART_NEON = "#a855f7";
const AXIS_GREY = "#8b87b0";

const STAT_CARDS = [
  { title: "Total Patients", value: "1,248", sub: "Admitted Active", icon: Users, trend: "+12%" },
  { title: "Bed Occupancy", value: "84%", sub: "West Ward Full", icon: Bed, trend: "Stable" },
  {
    title: "Daily Revenue",
    value: "₱ 242,500",
    sub: "Pending Filing",
    icon: DollarSign,
    trend: "+8.4%",
  },
];

function formatPeso(value: number) {
  return `₱ ${value.toLocaleString()}`;
}

interface DashboardViewProps {
  isLight: boolean;
  // who acknowledges MEWS alerts from this dashboard
  staffName: string;
}

export function DashboardView({ isLight, staffName }: DashboardViewProps) {
  const { patients, wards, occupiedBeds, mewsAlerts } = useData();
  const activeAlerts = mewsAlerts.filter((alert) => !alert.acknowledgedAt);
  const highAlerts = activeAlerts.filter((alert) => alert.risk === "High").length;

  // MEWS count is live from the alerts list; the other three are still design figures
  const statCards = [
    STAT_CARDS[0],
    STAT_CARDS[1],
    {
      title: "MEWS Alerts",
      value: String(activeAlerts.length).padStart(2, "0"),
      sub: activeAlerts.length > 0 ? "Requires Attention" : "All Acknowledged",
      icon: Activity,
      trend: highAlerts > 0 ? "Critical" : undefined,
    },
    STAT_CARDS[2],
  ];
  // TODO(Phase 6): drive the chart from the Billing service; for now the
  // range picker only changes the label, the data is always REVENUE_DATA
  const [range, setRange] = useState("this-week");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {/* hardcoded for the prototype walkthrough */}
          <p className="text-sm font-semibold text-wah-purple">Tuesday, May 5, 2026</p>
          <h2 className="text-3xl font-bold tracking-tight">Hospital Operations Center</h2>
        </div>
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wah-neon opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-wah-neon" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
            Connectivity: Optimal
          </span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-12">
        {/* min-w-0: grid items default to min-width:auto, so a wide child could
            push the whole column wider than the screen on tablets */}
        <div className="min-w-0 space-y-8 xl:col-span-8">
          <section className="glass rounded-[2rem] p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Revenue &amp; Admissions</h3>
                <p className="font-mono text-xs text-text-muted">7-Day Analysis</p>
              </div>
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                aria-label="Chart range"
                className={cn(
                  "rounded-xl border border-glass-border bg-glass-bg px-3 py-2",
                  "text-sm text-foreground outline-none focus:border-wah-purple",
                )}
              >
                <option value="this-week">This week</option>
                <option value="last-week">Last week</option>
              </select>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_PURPLE} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_PURPLE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke={isLight ? "rgba(109,40,217,0.14)" : "rgba(168,85,247,0.18)"}
                  />
                  <XAxis dataKey="name" stroke={AXIS_GREY} axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis
                    stroke={AXIS_GREY}
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => `₱${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatPeso(Number(value)), "Revenue"]}
                    contentStyle={{
                      background: isLight ? "#fdfbff" : "#17143a",
                      border: `1px solid ${isLight ? "rgba(109,40,217,0.14)" : "rgba(168,85,247,0.25)"}`,
                      borderRadius: 12,
                      color: isLight ? "#1e1b4b" : "#ede9fe",
                    }}
                    labelStyle={{ color: isLight ? "#6b6592" : "#a5a1c9" }}
                    cursor={{ stroke: CHART_NEON, strokeOpacity: 0.3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_NEON}
                    strokeWidth={3}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Replaced the old inventory watchlist: pharmacy is dispensing-only in the
              paper, and no service owns stock. Bed occupancy is in scope (UC-04, story 9). */}
          <section className="glass rounded-[2rem] p-8">
            <div className="mb-6">
              <h3 className="text-lg font-bold">Bed Occupancy by Ward</h3>
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
                          percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-orange-400" : "bg-emerald-500",
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

          <div className="glass flex items-center justify-between rounded-full py-2 pl-5 pr-2">
            <span className="text-sm font-bold">Active Cases</span>
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                "bg-wah-purple text-sm font-black text-white",
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
                "glass flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6",
                "text-text-muted",
              )}
            >
              <Plus size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">End of Daily Feed</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
