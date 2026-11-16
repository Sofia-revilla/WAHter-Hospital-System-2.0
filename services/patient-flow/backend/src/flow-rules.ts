// The UC-02 rules that don't need a database, kept here so they can be unit
// tested: which appointment slots are free, and which beds to offer when the
// one picked is gone (UC-02 extension 6a).

// Bookings run 08:00 to 17:00 Philippine time in 30-minute slots, Monday to
// Saturday. Placeholder hours until CDH gives its schedule.
export const SLOT_MINUTES = 30;
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 17;
const MANILA_OFFSET = "+08:00";

// Every slot start for a YYYY-MM-DD in Manila, as ISO instants, minus the
// taken ones and anything already past
export function freeSlots(date: string, taken: string[], now = new Date()) {
  const day = new Date(`${date}T12:00:00${MANILA_OFFSET}`);
  if (Number.isNaN(day.getTime()) || day.getUTCDay() === 0) return [];
  const takenTimes = new Set(taken.map((iso) => new Date(iso).getTime()));
  const slots: string[] = [];
  for (let minutes = DAY_START_HOUR * 60; minutes < DAY_END_HOUR * 60; minutes += SLOT_MINUTES) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    const start = new Date(`${date}T${hh}:${mm}:00${MANILA_OFFSET}`);
    if (start <= now || takenTimes.has(start.getTime())) continue;
    slots.push(start.toISOString());
  }
  return slots;
}

export function isSlotStart(iso: string) {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return false;
  // minutes since midnight in Manila
  const manila = (time.getUTCHours() * 60 + time.getUTCMinutes() + 8 * 60) % (24 * 60);
  // no bookings on Sunday, Manila date
  const manilaDay = new Date(time.getTime() + 8 * 3_600_000).getUTCDay();
  return (
    manilaDay !== 0 &&
    time.getUTCSeconds() === 0 &&
    manila >= DAY_START_HOUR * 60 &&
    manila < DAY_END_HOUR * 60 &&
    manila % SLOT_MINUTES === 0
  );
}

export interface FreeBed {
  bedId: string;
  code: string;
  roomCode: string;
  wardId: string;
  wardName: string;
  wardType: string;
  department: string;
}

// UC-02 6a: free beds in the same ward first, then wards of the same kind
// (same department, then same type), so the alternatives make clinical sense
export function alternativeBeds(free: FreeBed[], wanted: { wardId: string; department: string; wardType: string }, limit = 6) {
  const rank = (bed: FreeBed) =>
    bed.wardId === wanted.wardId ? 0 : bed.department === wanted.department ? 1 : bed.wardType === wanted.wardType ? 2 : 3;
  return [...free]
    .filter((bed) => rank(bed) < 3)
    .sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code))
    .slice(0, limit);
}
