"use client";

import { useState } from "react";
import { BedDouble, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import { wardLabel } from "@/lib/beds";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/StatCard";
import type { StaffRole } from "@/types";
import { AdmitDialog, type AdmitPreset } from "./AdmitDialog";
import { TransferDialog, type TransferTarget } from "./TransferDialog";
import type { BoardBed } from "./api";

// US-9: real-time bed occupancy across the wards, from Patient Flow's real
// beds (refreshed every few seconds with the rest of the portal). The
// Admitting Clerk and the Nurse admit into a free bed (UC-02); the Nurse
// transfers (US-8); the Physician only looks (Phase 3 brief).

const STATUS_STYLE: Record<BoardBed["status"], string> = {
  Available: "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500",
  Occupied: "border-wah-purple/40 bg-wah-purple/10",
  Cleaning: "border-amber-500/40 bg-amber-500/10",
  Maintenance: "border-slate-400/40 bg-slate-500/10",
};

interface BedManagementViewProps {
  role: StaffRole;
}

export function BedManagementView({ role }: BedManagementViewProps) {
  const { bedBoard, wards, patientName, providerName } = useData();
  const canAdmit = can(role, "admitPatient");
  const canTransfer = role === "Nurse";
  const [admitPreset, setAdmitPreset] = useState<AdmitPreset | null>(null);
  const [transfer, setTransfer] = useState<TransferTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wardFilter, setWardFilter] = useState("all");

  const total = wards.reduce((sum, ward) => sum + ward.capacity, 0);
  const occupied = wards.reduce((sum, ward) => sum + ward.occupied, 0);
  const available = wards.reduce((sum, ward) => sum + ward.available, 0);
  const visible = bedBoard.filter((ward) => wardFilter === "all" || ward.id === wardFilter);

  function clickBed(bed: BoardBed) {
    if (bed.status === "Available" && canAdmit) setAdmitPreset({ bedId: bed.id });
    if (bed.occupant && canTransfer) {
      setTransfer({
        admissionId: bed.occupant.admissionId,
        patientName: patientName(bed.occupant.patientId),
        fromBedCode: bed.code,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Patient Flow</p>
          <h2 className="text-2xl font-bold tracking-tight">Bed Board</h2>
          <p className="text-sm text-text-muted">
            {canAdmit
              ? canTransfer
                ? "Click a free bed to admit, or an occupied one to transfer."
                : "Click a free bed to admit a patient."
              : "View only."}
          </p>
        </div>
        {canAdmit && (
          <button
            type="button"
            onClick={() => setAdmitPreset({})}
            className="flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus size={16} /> Admit Patient
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Total Beds" value={String(total)} sub={`${wards.length} wards`} icon={BedDouble} />
        <StatCard title="Occupied" value={String(occupied)} sub={total ? `${Math.round((occupied / total) * 100)}% occupancy` : "—"} icon={BedDouble} />
        <StatCard title="Available" value={String(available)} sub="Ready for admission" icon={Plus} />
      </div>

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ward">
        {[{ id: "all", label: "All wards" }, ...bedBoard.map((ward) => ({ id: ward.id, label: wardLabel(ward) }))].map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={wardFilter === option.id}
            onClick={() => setWardFilter(option.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              wardFilter === option.id ? "border-wah-purple bg-wah-purple text-white" : "border-glass-border text-text-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        {(Object.keys(STATUS_STYLE) as BoardBed["status"][]).map((status) => (
          <span key={status} className="flex items-center gap-1">
            <span className={cn("h-3 w-3 rounded border", STATUS_STYLE[status])} /> {status}
          </span>
        ))}
      </div>

      {visible.map((ward) => (
        <section key={ward.id} className="glass rounded-xl p-5" aria-label={wardLabel(ward)}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ward.color }} />
              {wardLabel(ward)}
              <span className="text-xs font-normal text-text-muted">· {ward.department}</span>
            </h3>
            <span className="font-mono text-xs text-text-muted">
              {ward.occupied}/{ward.capacity} occupied · {ward.available} free
            </span>
          </div>
          <div className="space-y-3">
            {ward.rooms.map((room) => (
              <div key={room.id}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">{room.code}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {room.beds.map((bed) => {
                    const clickable = (bed.status === "Available" && canAdmit) || (bed.occupant && canTransfer);
                    return (
                      <button
                        key={bed.id}
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickBed(bed)}
                        aria-label={`Bed ${bed.code}, ${bed.status}${bed.occupant ? `, ${patientName(bed.occupant.patientId)}` : ""}`}
                        className={cn(
                          "min-h-[64px] rounded-lg border p-2 text-left text-xs transition-colors",
                          STATUS_STYLE[bed.status],
                          !clickable && "cursor-default",
                        )}
                      >
                        <p className="font-mono font-bold">{bed.code}</p>
                        {bed.occupant ? (
                          <>
                            <p className="truncate font-semibold">{patientName(bed.occupant.patientId)}</p>
                            <p className="truncate text-[10px] text-text-muted">{providerName(bed.occupant.attendingPhysicianId)}</p>
                          </>
                        ) : (
                          <p className="text-text-muted">{bed.status}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <AdmitDialog
        preset={admitPreset}
        onClose={() => setAdmitPreset(null)}
        onAdmitted={(message) => {
          setAdmitPreset(null);
          setNotice(message);
        }}
      />
      <TransferDialog
        target={transfer}
        onClose={() => setTransfer(null)}
        onTransferred={(message) => {
          setTransfer(null);
          setNotice(message);
        }}
      />
    </div>
  );
}
