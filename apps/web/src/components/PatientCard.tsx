"use client";

import { motion } from "motion/react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { riskLevelFor, type RiskLevel } from "@/lib/mews";
import { MAX_MEWS_SCORE } from "@/lib/mewsBands";
import type { Patient } from "@/types";
import { MewsChip } from "./MewsChip";

function statusDotClass(status: Patient["status"]) {
  if (status === "Critical") return "bg-rose-500 animate-pulse";
  if (status === "Stable") return "bg-emerald-500";
  return "bg-orange-400";
}

const RISK_BAR: Record<RiskLevel, string> = {
  Low: "bg-emerald-500",
  Medium: "bg-orange-400",
  High: "bg-rose-500",
};

interface PatientCardProps {
  patient: Patient;
}

export function PatientCard({ patient }: PatientCardProps) {
  const risk = riskLevelFor(patient.mewsScore);
  const mewsPercent = Math.min(patient.mewsScore / MAX_MEWS_SCORE, 1) * 100;

  return (
    <div className="rounded-xl bg-card-bg p-4 transition-shadow hover:ring-2 hover:ring-wah-purple/20">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              "border-2 border-wah-purple/40 bg-wah-purple/10 text-wah-neon",
            )}
          >
            <User size={20} />
          </div>
          <span
            aria-label={`Status: ${patient.status}`}
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card-bg",
              statusDotClass(patient.status),
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{patient.name}</p>
          <p className="font-mono text-xs text-text-muted">{patient.id}</p>
        </div>

        {/* TODO(Phase 9a): open the patient's encounter once Clinical Records exists */}
        <button
          type="button"
          className={cn(
            "rounded-lg bg-wah-lavender px-3 py-1.5 text-[10px] font-black uppercase text-wah-purple",
            "transition-colors hover:bg-wah-purple hover:text-white",
          )}
        >
          Join
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-text-muted">MEWS Score</span>
          <MewsChip risk={risk} score={patient.mewsScore} />
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-bg">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${mewsPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-full rounded-full", RISK_BAR[risk])}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <span className="rounded-md bg-glass-bg px-2 py-1 text-[10px] font-semibold text-text-muted">
          {patient.department}
        </span>
        <span className="rounded-md bg-glass-bg px-2 py-1 text-[10px] font-semibold text-text-muted">
          {patient.age} Y/O
        </span>
      </div>
    </div>
  );
}
