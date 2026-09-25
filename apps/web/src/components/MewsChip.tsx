import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/mews";

const RISK_STYLES: Record<RiskLevel, string> = {
  Low: "bg-emerald-500/10 text-emerald-600",
  Medium: "bg-orange-400/15 text-orange-500",
  High: "bg-rose-500/15 text-rose-500",
};

interface MewsChipProps {
  risk: RiskLevel;
  score?: number;
  className?: string;
}

// The colored risk chip shown next to vitals everywhere MEWS appears.
export function MewsChip({ risk, score, className }: MewsChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5",
        "text-[10px] font-black uppercase",
        RISK_STYLES[risk],
        className,
      )}
    >
      {risk}
      {score !== undefined && <span className="font-mono opacity-80">· {score}</span>}
    </span>
  );
}
