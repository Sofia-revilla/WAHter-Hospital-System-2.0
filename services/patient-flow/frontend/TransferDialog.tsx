"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import { postTransfer, type FreeBed } from "./api";

// US-8: the nurse moves an admitted patient to another bed or ward, and
// says why. The old bed is freed, both changes go to the bed status log, and
// the same admission continues in the new bed.

export interface TransferTarget {
  admissionId: string;
  patientName: string;
  fromBedCode: string;
}

interface TransferDialogProps {
  target: TransferTarget | null;
  onClose: () => void;
  onTransferred: (message: string) => void;
}

export function TransferDialog({ target, onClose, onTransferred }: TransferDialogProps) {
  const { bedBoard, refreshNow } = useData();
  const [bedId, setBedId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<FreeBed[]>([]);

  useEffect(() => {
    setBedId("");
    setReason("");
    setError(null);
    setAlternatives([]);
  }, [target]);

  const freeBeds = bedBoard.flatMap((ward) =>
    ward.rooms.flatMap((room) => room.beds.filter((bed) => bed.status === "Available").map((bed) => ({ bed, ward, room }))),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    if (!bedId || reason.trim().length < 3) {
      setError("Pick the new bed and say why the patient is moving.");
      return;
    }
    try {
      const moved = await postTransfer(target.admissionId, bedId, reason.trim());
      refreshNow();
      onTransferred(`Moved ${target.patientName} from ${target.fromBedCode} to ${moved.bedCode}.`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const body = caught.body as { alternatives?: FreeBed[] } | null;
        if (caught.status === 409 && body?.alternatives) {
          setAlternatives(body.alternatives);
          setBedId("");
          refreshNow();
        }
        setError(caught.message);
      } else {
        setError("Couldn't reach Patient Flow. Try again.");
      }
    }
  }

  return (
    <Modal
      isOpen={target !== null}
      title={`Transfer ${target?.patientName ?? ""}`}
      eyebrow={`Now in ${target?.fromBedCode ?? ""}`}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <label className="block space-y-1">
          <span className={labelClass}>New bed</span>
          <select value={bedId} onChange={(event) => setBedId(event.target.value)} className={fieldClass}>
            <option value="">Choose a free bed</option>
            {freeBeds.map(({ bed, ward, room }) => (
              <option key={bed.id} value={bed.id}>
                {bed.code} · {ward.name} ({ward.type}) · {room.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Needs isolation, moved to ICU"
            className={fieldClass}
          />
        </label>
        {alternatives.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alternatives.map((bed) => (
              <button
                key={bed.bedId}
                type="button"
                onClick={() => setBedId(bed.bedId)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                  bedId === bed.bedId ? "border-wah-purple bg-wah-purple/10" : "border-glass-border",
                )}
              >
                <BedDouble size={12} /> {bed.code} · {bed.wardName}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Transfer
          </button>
        </div>
      </form>
    </Modal>
  );
}
