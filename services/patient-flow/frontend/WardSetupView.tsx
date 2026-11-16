"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { History, Plus, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, timeAgo } from "@/lib/api";
import { wardLabel } from "@/lib/beds";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import { DEPARTMENTS } from "@/types";
import {
  addBeds,
  addRoom,
  createWard,
  fetchBedHistory,
  fetchWardLayout,
  setBedStatus,
  updateWard,
  type BedHistoryEntry,
  type BoardBed,
  type BoardWard,
} from "./api";

// US-44: the System Administrator keeps the hospital's layout in WAHter:
// wards, rooms, and beds, and takes a bed out for cleaning or maintenance.
// No patient names here (RA 10173): the layout comes without occupants.

const STATUS_STYLE: Record<BoardBed["status"], string> = {
  Available: "border-emerald-500/40 bg-emerald-500/5",
  Occupied: "border-wah-purple/40 bg-wah-purple/10",
  Cleaning: "border-amber-500/40 bg-amber-500/10",
  Maintenance: "border-slate-400/40 bg-slate-500/10",
};

type Dialog =
  | { kind: "ward" }
  | { kind: "room"; ward: BoardWard }
  | { kind: "bed"; bed: BoardBed; wardName: string }
  | null;

export function WardSetupView() {
  const [layout, setLayout] = useState<BoardWard[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLayout(await fetchWardLayout());
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof ApiError ? caught.message : "Couldn't reach Patient Flow." });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ tone: "ok", text: success });
      setDialog(null);
      await load();
      return true;
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof ApiError ? caught.message : "That didn't go through." });
      return false;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-wah-purple">System Administration</p>
          <h2 className="text-2xl font-bold tracking-tight">Wards, Rooms and Beds</h2>
          <p className="text-sm text-text-muted">Click a bed to take it out for cleaning or maintenance, or put it back.</p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ kind: "ward" })}
          className="flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add ward
        </button>
      </div>

      {notice && (
        <p className={cn("rounded-lg px-4 py-3 text-sm", notice.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600")}>
          {notice.text}
        </p>
      )}

      {layout.map((ward) => (
        <section key={ward.id} className="glass rounded-xl p-5" aria-label={wardLabel(ward)}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-bold">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ward.color }} />
              {wardLabel(ward)} <span className="font-mono text-xs font-normal text-text-muted">{ward.id}</span>
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={ward.department}
                onChange={(event) => void run(() => updateWard(ward.id, { department: event.target.value }), `${ward.name} is now ${event.target.value}.`)}
                aria-label={`Department of ${ward.name}`}
                className="rounded-lg border border-glass-border bg-glass-bg px-2 py-1 text-xs"
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setDialog({ kind: "room", ward })}
                className="flex items-center gap-1 rounded-lg border border-glass-border px-2 py-1 text-xs font-semibold hover:bg-glass-bg"
              >
                <Plus size={12} /> Room
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {ward.rooms.map((room) => (
              <div key={room.id}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{room.code}</p>
                  <button
                    type="button"
                    onClick={() => void run(() => addBeds(room.id, 1), `Added a bed to ${room.code}.`)}
                    className="text-[10px] font-semibold text-wah-purple hover:underline"
                  >
                    + bed
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {room.beds.map((bed) => (
                    <button
                      key={bed.id}
                      type="button"
                      onClick={() => setDialog({ kind: "bed", bed, wardName: wardLabel(ward) })}
                      className={cn("rounded-lg border px-2 py-1 text-left font-mono text-xs", STATUS_STYLE[bed.status])}
                    >
                      {bed.code}
                      <span className="block font-sans text-[10px] text-text-muted">{bed.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {dialog?.kind === "ward" && <WardDialog onClose={() => setDialog(null)} onSubmit={(ward) => run(() => createWard(ward), `Added ${ward.name}.`)} />}
      {dialog?.kind === "room" && (
        <RoomDialog
          ward={dialog.ward}
          onClose={() => setDialog(null)}
          onSubmit={(code, beds) => run(() => addRoom(dialog.ward.id, code, beds), `Added ${code} with ${beds} beds.`)}
        />
      )}
      {dialog?.kind === "bed" && (
        <BedDialog
          bed={dialog.bed}
          wardName={dialog.wardName}
          onClose={() => setDialog(null)}
          onSubmit={(status, reason) => run(() => setBedStatus(dialog.bed.id, status, reason), `Bed ${dialog.bed.code} is now ${status}.`)}
        />
      )}
    </div>
  );
}

function WardDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (ward: { id: string; name: string; type: string; department: string; color: string }) => Promise<boolean>;
}) {
  const [ward, setWard] = useState({ id: "W-006", name: "", type: "Specialized", department: DEPARTMENTS[0] as string, color: "#f59e0b" });
  return (
    <Modal isOpen title="Add a ward" eyebrow="US-44" onClose={onClose}>
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void onSubmit(ward);
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={labelClass}>Ward ID</span>
            <input value={ward.id} onChange={(event) => setWard({ ...ward, id: event.target.value })} className={cn(fieldClass, "font-mono")} />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Name</span>
            <input value={ward.name} onChange={(event) => setWard({ ...ward, name: event.target.value })} placeholder="e.g. Surgical Ward" className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Type</span>
            <select value={ward.type} onChange={(event) => setWard({ ...ward, type: event.target.value })} className={fieldClass}>
              {["Male", "Female", "Specialized", "Children"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Department</span>
            <select value={ward.department} onChange={(event) => setWard({ ...ward, department: event.target.value })} className={fieldClass}>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Color</span>
            <input type="color" value={ward.color} onChange={(event) => setWard({ ...ward, color: event.target.value })} className="h-11 w-full rounded-lg" />
          </label>
        </div>
        <p className="text-xs text-text-muted">Add its rooms and beds after saving.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Add ward
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RoomDialog({ ward, onClose, onSubmit }: { ward: BoardWard; onClose: () => void; onSubmit: (code: string, beds: number) => Promise<boolean> }) {
  const [code, setCode] = useState(`Room ${ward.rooms.length + 1}`);
  const [beds, setBeds] = useState(5);
  return (
    <Modal isOpen title={`Add a room to ${ward.name}`} eyebrow="US-44" onClose={onClose}>
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void onSubmit(code.trim(), beds);
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={labelClass}>Room</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Beds</span>
            <input type="number" min={1} max={20} value={beds} onChange={(event) => setBeds(Number(event.target.value))} className={fieldClass} />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Add room
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BedDialog({
  bed,
  wardName,
  onClose,
  onSubmit,
}: {
  bed: BoardBed;
  wardName: string;
  onClose: () => void;
  onSubmit: (status: "Available" | "Cleaning" | "Maintenance", reason: string) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<"Available" | "Cleaning" | "Maintenance">(bed.status === "Available" ? "Maintenance" : "Available");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<BedHistoryEntry[]>([]);

  useEffect(() => {
    fetchBedHistory(bed.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [bed.id]);

  return (
    <Modal isOpen title={`Bed ${bed.code}`} eyebrow={`${wardName} · now ${bed.status}`} onClose={onClose}>
      <div className="space-y-4">
        {bed.status === "Occupied" ? (
          <p className="text-sm text-text-muted">A patient is in this bed. It frees up when they&apos;re transferred or discharged.</p>
        ) : (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void onSubmit(status, reason.trim());
            }}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className={labelClass}>Set to</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={fieldClass}>
                  {(["Available", "Cleaning", "Maintenance"] as const)
                    .filter((option) => option !== bed.status)
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={labelClass}>Reason</span>
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Broken bed rail" className={fieldClass} />
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="flex items-center gap-1 rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
                <Wrench size={14} /> Save
              </button>
            </div>
          </form>
        )}
        <div>
          <p className={cn(labelClass, "mb-1 flex items-center gap-1")}>
            <History size={12} /> Bed status log
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-text-muted">
            {history.map((entry, index) => (
              <li key={`${entry.changedAt}-${index}`}>
                {timeAgo(entry.changedAt)}: {entry.fromStatus ?? "new"} → {entry.toStatus} ({entry.reason})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
