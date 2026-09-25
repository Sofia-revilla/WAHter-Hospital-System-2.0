"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/context/DataContext";
import { riskLevelFor, type RiskLevel } from "@/lib/mews";

const RISKS: RiskLevel[] = ["Low", "Medium", "High"];

// Recharts writes colors into SVG attributes, where var(--…) doesn't resolve,
// so these are hex values. Same shades as MewsChip.
const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "#10b981",
  Medium: "#fb923c",
  High: "#f43f5e",
};
const AXIS_GREY = "#9892b8";

interface RiskTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: string;
}

// small dark pill instead of Recharts' default white box
function RiskTooltip({ active, payload, label }: RiskTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-wah-deep px-3 py-2 text-xs text-white shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name}>
          {entry.name}: {entry.value} {entry.value === 1 ? "patient" : "patients"}
        </p>
      ))}
    </div>
  );
}

interface PatientRiskChartProps {
  isLight: boolean;
}

// MEWS risk per department, the paper's early-warning view (objective 4).
// Grouped slim bars rather than a stack, so each risk level reads on its own.
export function PatientRiskChart({ isLight }: PatientRiskChartProps) {
  const { patients } = useData();

  const departments = [...new Set(patients.map((patient) => patient.department))];
  const riskByDepartment = departments.map((department) => {
    const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0 };
    patients
      .filter((patient) => patient.department === department)
      .forEach((patient) => counts[riskLevelFor(patient.mewsScore)]++);
    return { department, ...counts };
  });

  return (
    <section className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1">
        <div className="mr-auto">
          <h3 className="font-bold">Patient Risk by Department</h3>
          <p className="text-xs text-text-muted">Latest MEWS for each admitted patient</p>
        </div>
        {RISKS.map((risk) => (
          <span key={risk} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[risk] }} />
            {risk}
          </span>
        ))}
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={riskByDepartment}
            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            barGap={4}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="4 6"
              vertical={false}
              stroke={isLight ? "rgba(109,40,217,0.10)" : "rgba(168,85,247,0.14)"}
            />
            <XAxis dataKey="department" stroke={AXIS_GREY} axisLine={false} tickLine={false} fontSize={12} />
            <YAxis stroke={AXIS_GREY} axisLine={false} tickLine={false} fontSize={12} allowDecimals={false} />
            <Tooltip
              content={<RiskTooltip />}
              cursor={{ fill: isLight ? "rgba(109,40,217,0.05)" : "rgba(168,85,247,0.08)" }}
            />
            {RISKS.map((risk) => (
              <Bar
                key={risk}
                name={risk}
                dataKey={risk}
                fill={RISK_COLORS[risk]}
                radius={[6, 6, 0, 0]}
                maxBarSize={14}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
