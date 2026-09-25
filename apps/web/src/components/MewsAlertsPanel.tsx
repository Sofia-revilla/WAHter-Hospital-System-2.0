"use client";

import { useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import type { MewsAlert } from "@/types";
import { MewsChip } from "./MewsChip";

function minutesSince(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return minutes < 1 ? "just now" : `${minutes} min ago`;
}

interface AlertRowProps {
  alert: MewsAlert;
  staffName: string;
}

function AlertRow({ alert, staffName }: AlertRowProps) {
  const { acknowledgeAlert } = useData();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [note, setNote] = useState("");
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);

  function confirm() {
    acknowledgeAlert(alert.id, { by: staffName, note: note.trim() || undefined, isFalseAlarm });
  }

  return (
    <li
      className={cn(
        "rounded-2xl border p-4",
        alert.risk === "High"
          ? "border-rose-500/30 bg-rose-500/5"
          : "border-orange-400/30 bg-orange-400/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{alert.patientName}</p>
          <p className="font-mono text-[10px] text-text-muted">
            {alert.patientId} · {minutesSince(alert.raisedAt)}
          </p>
        </div>
        <MewsChip risk={alert.risk} score={alert.mewsScore} />
      </div>

      {isAcknowledging ? (
        <div className="mt-3 space-y-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Response note (optional), e.g. doctor informed"
            aria-label="Acknowledgment note"
            className={cn(
              "w-full rounded-lg border border-glass-border bg-glass-bg px-3 py-2 text-xs",
              "text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
            )}
          />
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={isFalseAlarm}
              onChange={(event) => setIsFalseAlarm(event.target.checked)}
            />
            False alarm / data correction needed
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAcknowledging(false)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              className="rounded-lg bg-wah-purple px-3 py-1.5 text-[10px] font-black uppercase text-white"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAcknowledging(true)}
          className={cn(
            "mt-3 w-full rounded-lg bg-wah-purple py-2 text-[10px] font-black uppercase text-white",
            "transition-colors hover:bg-wah-neon",
          )}
        >
          Acknowledge
        </button>
      )}
    </li>
  );
}

interface MewsAlertsPanelProps {
  staffName: string;
}

// Active MEWS alerts for the ward (UC-08). Acknowledged ones drop off the list
// but stay recorded on the alert itself.
export function MewsAlertsPanel({ staffName }: MewsAlertsPanelProps) {
  const { mewsAlerts } = useData();
  const active = mewsAlerts.filter((alert) => !alert.acknowledgedAt);
  const acknowledgedCount = mewsAlerts.length - active.length;

  return (
    <section className="glass rounded-[2rem] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold">
          <BellRing size={18} className="text-rose-500" /> MEWS Alerts
        </h3>
        <span className="text-[10px] font-bold uppercase text-text-muted">
          {acknowledgedCount} acknowledged
        </span>
      </div>

      {active.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <CheckCircle2 size={16} className="text-emerald-500" /> No active alerts. All caught up.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((alert) => (
            <AlertRow key={alert.id} alert={alert} staffName={staffName} />
          ))}
        </ul>
      )}
      {/* TODO(Phase 2): escalate unacknowledged alerts after the hospital's configured window (UC-08 BR-02) */}
    </section>
  );
}
