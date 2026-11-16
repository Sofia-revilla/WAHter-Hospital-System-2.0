"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, Clock, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import { patientIdentifiers } from "@/components/PatientPicker";
import { PatientSearch } from "@services/patient-registry/frontend/PatientSearch";
import { DEPARTMENTS } from "@/types";
import { AdmitDialog, type AdmitPreset } from "./AdmitDialog";
import {
  bookAppointment,
  checkInAppointment,
  fetchAppointments,
  fetchAvailability,
  fetchQueue,
  updateAppointment,
  type Appointment,
} from "./api";

// UC-02, the scheduling side ("Manage scheduling and referrals", Admitting
// Clerk): book a department, physician, date, and time from the free slots;
// check the patient in for a queue number; see who's next; admit a scheduled
// patient straight from their booking.

const REFRESH_MS = 10_000;

const STATUS_STYLE: Record<Appointment["status"], string> = {
  Booked: "bg-blue-500/10 text-blue-600",
  CheckedIn: "bg-amber-500/10 text-amber-700",
  Completed: "bg-emerald-500/10 text-emerald-700",
  Cancelled: "bg-slate-500/10 text-text-muted",
  NoShow: "bg-rose-500/10 text-rose-600",
};

function manilaToday() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" });
}

export function SchedulingView() {
  const { patientName, providerName, refreshNow } = useData();
  const [date, setDate] = useState(manilaToday());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<Appointment[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [isBooking, setIsBooking] = useState(false);
  const [admitPreset, setAdmitPreset] = useState<AdmitPreset | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [day, line] = await Promise.all([fetchAppointments(date), fetchQueue()]);
      setAppointments(day);
      setQueue(line);
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof ApiError ? caught.message : "Couldn't reach Patient Flow." });
    }
  }, [date]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // bookings made here carry the patient's name; others fall back to the shared directory
  const nameOf = (patientId: string) => names.get(patientId) ?? patientName(patientId);

  async function act(action: () => Promise<Appointment>, success: (appointment: Appointment) => string) {
    try {
      const appointment = await action();
      setNotice({ tone: "ok", text: success(appointment) });
      await load();
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof ApiError ? caught.message : "That didn't go through." });
    }
  }

  const waitingByDepartment = DEPARTMENTS.map((department) => ({
    department,
    waiting: queue.filter((item) => item.department === department),
  })).filter((group) => group.waiting.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Patient Flow</p>
          <h2 className="text-2xl font-bold tracking-tight">Scheduling and Queue</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsBooking(true)}
          className="flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          <CalendarPlus size={16} /> Book
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            notice.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600",
          )}
        >
          {notice.text}
        </p>
      )}

      <section className="glass rounded-xl p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold">
          <ListOrdered size={18} className="text-wah-neon" /> Today&apos;s queue
        </h3>
        {waitingByDepartment.length === 0 ? (
          <p className="text-sm text-text-muted">Nobody is waiting.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {waitingByDepartment.map((group) => (
              <div key={group.department} className="rounded-lg border border-glass-border p-3">
                <p className="mb-2 text-sm font-semibold">{group.department}</p>
                <ol className="space-y-1 text-sm">
                  {group.waiting.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span>
                        <span className="font-mono font-bold">#{item.queueNumber}</span> {nameOf(item.patientId)}
                      </span>
                      <span className="text-xs text-text-muted">{item.queuePosition === 1 ? "Next" : `Position ${item.queuePosition}`}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold">
            <Clock size={18} className="text-wah-neon" /> Bookings
          </h3>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Day" className={cn(fieldClass, "w-auto")} />
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <th className="py-2">Time</th>
              <th className="py-2">Patient</th>
              <th className="hidden py-2 md:table-cell">Department · Physician</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-text-muted">
                  No bookings on this day.
                </td>
              </tr>
            )}
            {appointments.map((item) => (
              <tr key={item.id} className="border-b border-glass-border/50">
                <td className="py-2 font-mono">{timeOf(item.scheduledAt)}</td>
                <td className="py-2">
                  <p className="font-semibold">{nameOf(item.patientId)}</p>
                  <p className="text-xs text-text-muted">{item.purpose}</p>
                </td>
                <td className="hidden py-2 text-text-muted md:table-cell">
                  {item.department} · {providerName(item.physicianId)}
                </td>
                <td className="py-2">
                  <span className={cn("rounded-md px-2 py-1 text-[10px] font-black uppercase", STATUS_STYLE[item.status])}>
                    {item.status === "CheckedIn" ? `Waiting #${item.queueNumber}` : item.status}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {item.status === "Booked" && (
                      <>
                        <button
                          type="button"
                          onClick={() => void act(() => checkInAppointment(item.id), (done) => `Checked in. Queue number ${done.queueNumber}.`)}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-wah-purple hover:bg-wah-purple/10"
                        >
                          Check in
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(() => updateAppointment(item.id, "NoShow"), () => "Marked as no-show.")}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-text-muted hover:bg-glass-bg"
                        >
                          No-show
                        </button>
                      </>
                    )}
                    {(item.status === "Booked" || item.status === "CheckedIn") && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setAdmitPreset({
                              appointmentId: item.id,
                              physicianId: item.physicianId,
                              patient: { id: item.patientId, name: nameOf(item.patientId), birthDate: "" },
                            })
                          }
                          className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 hover:bg-emerald-500/10"
                        >
                          Admit
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(() => updateAppointment(item.id, "Cancelled"), () => "Booking cancelled.")}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-500/10"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <BookingDialog
        isOpen={isBooking}
        onClose={() => setIsBooking(false)}
        onBooked={(appointment, name) => {
          setIsBooking(false);
          setNames((current) => new Map(current).set(appointment.patientId, name));
          setDate(new Date(new Date(appointment.scheduledAt).getTime() + 8 * 3_600_000).toISOString().slice(0, 10));
          setNotice({ tone: "ok", text: `Booked ${name} at ${timeOf(appointment.scheduledAt)} (${appointment.id}).` });
          void load();
        }}
      />
      <AdmitDialog
        preset={admitPreset}
        onClose={() => setAdmitPreset(null)}
        onAdmitted={(message) => {
          setAdmitPreset(null);
          setNotice({ tone: "ok", text: message });
          refreshNow();
          void load();
        }}
      />
    </div>
  );
}

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBooked: (appointment: Appointment, patientName: string) => void;
}

function BookingDialog({ isOpen, onClose, onBooked }: BookingDialogProps) {
  const { providers } = useData();
  const physicians = providers.filter((provider) => provider.role === "Physician");
  const [patient, setPatient] = useState<{ id: string; name: string; birthDate: string } | null>(null);
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [physicianId, setPhysicianId] = useState("");
  const [date, setDate] = useState(manilaToday());
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);

  // UC-02 step 6: only the slots still free for that physician that day
  useEffect(() => {
    setSlot("");
    if (!physicianId || !date) {
      setSlots([]);
      return;
    }
    fetchAvailability(physicianId, date)
      .then((result) => setSlots(result.slots))
      .catch(() => setSlots([]));
  }, [physicianId, date]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || !physicianId || !slot || purpose.trim().length < 3) {
      setError("Pick the patient, physician, a free time, and say what it's for.");
      return;
    }
    try {
      const appointment = await bookAppointment({ patientId: patient.id, department, physicianId, scheduledAt: slot, purpose: purpose.trim() });
      onBooked(appointment, patient.name);
      setPatient(null);
      setPurpose("");
    } catch (caught) {
      if (caught instanceof ApiError) {
        const body = caught.body as { alternatives?: string[] } | null;
        // UC-02 6b: someone booked that slot first; show the ones still free
        if (caught.status === 409 && body?.alternatives) {
          setSlots(body.alternatives);
          setSlot("");
        }
        setError(caught.message);
      } else {
        setError("Couldn't reach Patient Flow.");
      }
    }
  }

  return (
    <Modal isOpen={isOpen} title="Book an appointment" eyebrow="Scheduling (UC-02)" onClose={onClose} width="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-2">
          <p className={labelClass}>Patient</p>
          {patient ? (
            <div className={cn(fieldClass, "flex items-center justify-between")}>
              <div>
                <p className="font-semibold">{patient.name}</p>
                <p className="font-mono text-[10px] text-text-muted">{patientIdentifiers(patient)}</p>
              </div>
              <button type="button" onClick={() => setPatient(null)} className="text-xs font-semibold text-wah-purple hover:underline">
                Change
              </button>
            </div>
          ) : (
            <PatientSearch onSelect={(found) => setPatient(found)} />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className={labelClass}>Department</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldClass}>
              {DEPARTMENTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Physician</span>
            <select value={physicianId} onChange={(event) => setPhysicianId(event.target.value)} className={fieldClass}>
              <option value="">Choose…</option>
              {physicians.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} · {provider.department}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Day</span>
            <input type="date" value={date} min={manilaToday()} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
          </label>
        </div>
        <div className="space-y-1">
          <p className={labelClass}>Free times</p>
          {physicianId ? (
            slots.length === 0 ? (
              <p className="text-sm text-text-muted">No free times that day. Try another day.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSlot(option)}
                    className={cn(
                      "rounded-lg border px-2 py-1 font-mono text-xs",
                      slot === option ? "border-wah-purple bg-wah-purple text-white" : "border-glass-border hover:border-wah-purple",
                    )}
                  >
                    {timeOf(option)}
                  </button>
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-text-muted">Pick a physician to see their free times.</p>
          )}
        </div>
        <label className="block space-y-1">
          <span className={labelClass}>For</span>
          <input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="e.g. Elective admission for cholecystectomy"
            className={fieldClass}
          />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Book
          </button>
        </div>
      </form>
    </Modal>
  );
}
