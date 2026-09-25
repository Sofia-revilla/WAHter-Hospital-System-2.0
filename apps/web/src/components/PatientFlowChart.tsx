"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { PATIENT_FLOW } from "@/constants";

type Range = keyof typeof PATIENT_FLOW;

const RANGES: { id: Range; label: string }[] = [
  { id: "7D", label: "7D" },
  { id: "1M", label: "1M" },
  { id: "1Y", label: "1Y" },
];

// Recharts writes colors into SVG attributes, where var(--…) doesn't resolve,
// so these are the token hex values. Admissions flip to lavender in dark mode
// because wah-deep disappears against the dark background.
const DEEP = "#1e1b4b";
const LAVENDER = "#e9d5ff";
const NEON = "#a855f7";
const AXIS_GREY = "#9892b8";

interface FlowTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: string;
}

// small dark pill like the reference, instead of Recharts' default white box
function FlowTooltip({ active, payload, label }: FlowTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-wah-deep px-3 py-2 text-xs text-white shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name}>
          {entry.value} {entry.name?.toLowerCase()}
        </p>
      ))}
    </div>
  );
}

interface PatientFlowChartProps {
  isLight: boolean;
}

export function PatientFlowChart({ isLight }: PatientFlowChartProps) {
  const [range, setRange] = useState<Range>("1Y");
  const admissionsColor = isLight ? DEEP : LAVENDER;

  return (
    <section className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <h3 className="font-bold">Patient Flow</h3>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: admissionsColor }} />
            Admissions
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: NEON }} />
            Discharges
          </span>
        </div>

        <div className="flex rounded-full bg-glass-bg p-1" role="tablist" aria-label="Chart range">
          {RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={range === option.id}
              onClick={() => setRange(option.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                range === option.id
                  ? "bg-wah-purple text-white"
                  : "text-text-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={PATIENT_FLOW[range]}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            barGap={4}
            barCategoryGap={range === "1Y" ? "28%" : "38%"}
          >
            <CartesianGrid
              strokeDasharray="4 6"
              vertical={false}
              stroke={isLight ? "rgba(109,40,217,0.10)" : "rgba(168,85,247,0.14)"}
            />
            <XAxis dataKey="label" stroke={AXIS_GREY} axisLine={false} tickLine={false} fontSize={12} />
            <YAxis stroke={AXIS_GREY} axisLine={false} tickLine={false} fontSize={12} allowDecimals={false} />
            <Tooltip
              content={<FlowTooltip />}
              cursor={{ fill: isLight ? "rgba(109,40,217,0.05)" : "rgba(168,85,247,0.08)" }}
            />
            <Bar
              name="Admissions"
              dataKey="admissions"
              fill={admissionsColor}
              radius={[6, 6, 0, 0]}
              maxBarSize={14}
            />
            <Bar
              name="Discharges"
              dataKey="discharges"
              fill={NEON}
              radius={[6, 6, 0, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
