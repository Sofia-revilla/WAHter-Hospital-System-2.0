import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, requireKnownPatient, ServiceClient, type AuthUser } from "@wahter/shared";
import { freeSlots, isSlotStart } from "../flow-rules";
import type { BookAppointmentDto, UpdateAppointmentDto } from "./scheduling.dto";

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AppointmentRow {
  id: string;
  patient_id: string;
  department: string;
  physician_id: string;
  scheduled_at: Date;
  duration_minutes: number;
  purpose: string;
  status: "Booked" | "CheckedIn" | "Completed" | "Cancelled" | "NoShow";
  queue_date: Date | null;
  queue_number: number | null;
  checked_in_at: Date | null;
  booked_by_id: string;
}

function toAppointment(row: AppointmentRow, position: number | null = null) {
  return {
    id: row.id,
    patientId: row.patient_id,
    department: row.department,
    physicianId: row.physician_id,
    scheduledAt: row.scheduled_at.toISOString(),
    durationMinutes: row.duration_minutes,
    purpose: row.purpose,
    status: row.status,
    queueNumber: row.queue_number,
    // where they are in today's line: 1 is next
    queuePosition: position,
    checkedInAt: row.checked_in_at?.toISOString() ?? null,
    bookedById: row.booked_by_id,
  };
}

// Today in Manila as YYYY-MM-DD
function manilaToday() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

// UC-02, the scheduling side: book a department, physician, date, and time;
// check in; and keep the department's queue (Admitting Clerk)
@Injectable()
export class SchedulingService {
  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
    private readonly services: ServiceClient,
  ) {}

  async day(date: string | undefined, department: string | undefined) {
    const day = date && DATE.test(date) ? date : manilaToday();
    const rows = await this.database.query<AppointmentRow>(
      `SELECT * FROM appointments
        WHERE (scheduled_at AT TIME ZONE 'Asia/Manila')::date = $1::date
          AND ($2::text IS NULL OR department = $2)
        ORDER BY scheduled_at`,
      [day, department ?? null],
    );
    const positions = await this.positions(day);
    return rows.map((row) => toAppointment(row, positions.get(row.id) ?? null));
  }

  // UC-02 step 6: what's still free for this physician on this day
  async availability(physicianId: string, date: string) {
    if (!physicianId || !date || !DATE.test(date)) throw new BadRequestException("Pick a physician and a date.");
    const taken = await this.takenSlots(physicianId, date);
    return { physicianId, date, slots: freeSlots(date, taken) };
  }

  async book(body: BookAppointmentDto, user: AuthUser) {
    if (!isSlotStart(body.scheduledAt)) {
      const text = "Pick one of the listed time slots";
      throw new BadRequestException({ message: text, fields: { scheduledAt: text } });
    }
    if (new Date(body.scheduledAt) <= new Date()) {
      const text = "That time has already passed";
      throw new BadRequestException({ message: text, fields: { scheduledAt: text } });
    }
    await requireKnownPatient(this.services, body.patientId);

    let id: string;
    try {
      const row = await this.database.one<{ id: string }>(
        `INSERT INTO appointments (id, patient_id, department, physician_id, scheduled_at, purpose, booked_by_id)
         VALUES ('APT-' || lpad(nextval('appointment_number')::text, 6, '0'), $1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [body.patientId, body.department.trim(), body.physicianId, body.scheduledAt, body.purpose.trim(), user.id],
      );
      id = row!.id;
    } catch (error) {
      // UC-02 6a/6b: someone else got the slot; say so with what's still free
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        const date = new Date(new Date(body.scheduledAt).getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
        const slots = freeSlots(date, await this.takenSlots(body.physicianId, date));
        throw new ConflictException({ message: "That slot was just booked. Pick another time.", alternatives: slots });
      }
      throw error;
    }
    this.bus.publish(
      EVENT_TYPES.appointmentBooked,
      { appointmentId: id, patientId: body.patientId, physicianId: body.physicianId, department: body.department },
      user,
    );
    return this.get(id);
  }

  // The patient arrived: they get the next number in their department's
  // queue for the day. The advisory lock keeps two clerks from handing out
  // the same number at the same moment.
  async checkIn(id: string, user: AuthUser) {
    const row = await this.database.transaction(async (client) => {
      const { rows } = await client.query<AppointmentRow>("SELECT * FROM appointments WHERE id = $1 FOR UPDATE", [id]);
      const appointment = rows[0];
      if (!appointment) throw new NotFoundException(`No appointment ${id}`);
      if (appointment.status !== "Booked") throw new ConflictException(`This booking is ${appointment.status}.`);
      const today = manilaToday();
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`queue:${appointment.department}:${today}`]);
      const { rows: next } = await client.query<{ number: number }>(
        `SELECT coalesce(max(queue_number), 0) + 1 AS number FROM appointments WHERE department = $1 AND queue_date = $2`,
        [appointment.department, today],
      );
      const { rows: updated } = await client.query<AppointmentRow>(
        `UPDATE appointments SET status = 'CheckedIn', queue_date = $2, queue_number = $3, checked_in_at = now(),
                                 updated_at = now()
          WHERE id = $1 RETURNING *`,
        [id, today, next[0].number],
      );
      return updated[0];
    });
    this.publishUpdate(row, user);
    return this.get(id);
  }

  async update(id: string, body: UpdateAppointmentDto, user: AuthUser) {
    const row = await this.database.one<AppointmentRow>(
      `UPDATE appointments SET status = $2, updated_at = now()
        WHERE id = $1 AND status IN ('Booked', 'CheckedIn')
        RETURNING *`,
      [id, body.status],
    );
    if (!row) {
      await this.get(id);
      throw new ConflictException("This booking is already closed.");
    }
    this.publishUpdate(row, user);
    return this.get(id);
  }

  // Everyone checked in and not yet seen, in order (UC-02 step 7: queue position)
  async queue(department: string | undefined) {
    const today = manilaToday();
    const rows = await this.database.query<AppointmentRow>(
      `SELECT * FROM appointments
        WHERE status = 'CheckedIn' AND queue_date = $1 AND ($2::text IS NULL OR department = $2)
        ORDER BY department, queue_number`,
      [today, department ?? null],
    );
    const positions = await this.positions(today);
    return rows.map((row) => toAppointment(row, positions.get(row.id) ?? null));
  }

  async get(id: string) {
    const row = await this.database.one<AppointmentRow>("SELECT * FROM appointments WHERE id = $1", [id]);
    if (!row) throw new NotFoundException(`No appointment ${id}`);
    const positions = row.queue_date ? await this.positions(row.queue_date.toISOString().slice(0, 10)) : new Map();
    return toAppointment(row, positions.get(row.id) ?? null);
  }

  private async positions(day: string) {
    const rows = await this.database.query<{ id: string; position: string }>(
      `SELECT id, row_number() OVER (PARTITION BY department ORDER BY queue_number) AS position
         FROM appointments WHERE status = 'CheckedIn' AND queue_date = $1`,
      [day],
    );
    return new Map(rows.map((row) => [row.id, Number(row.position)]));
  }

  private async takenSlots(physicianId: string, date: string) {
    const rows = await this.database.query<{ scheduled_at: Date }>(
      `SELECT scheduled_at FROM appointments
        WHERE physician_id = $1 AND status IN ('Booked', 'CheckedIn')
          AND (scheduled_at AT TIME ZONE 'Asia/Manila')::date = $2::date`,
      [physicianId, date],
    );
    return rows.map((row) => row.scheduled_at.toISOString());
  }

  private publishUpdate(row: AppointmentRow, user: AuthUser) {
    this.bus.publish(
      EVENT_TYPES.appointmentUpdated,
      { appointmentId: row.id, patientId: row.patient_id, status: row.status, queueNumber: row.queue_number },
      user,
    );
  }
}
