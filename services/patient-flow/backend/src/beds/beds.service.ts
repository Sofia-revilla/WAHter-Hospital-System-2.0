import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { BedsRepository, type BoardRow } from "./beds.repository";
import type { CreateRoomDto, CreateWardDto, SetBedStatusDto, UpdateWardDto } from "./beds.dto";

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";

// US-9: the bed board, nested ward → room → bed, the shape the screen draws
export function toBoard(rows: BoardRow[]) {
  const wards = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      color: string;
      department: string;
      rooms: Map<string, { id: string; code: string; beds: unknown[] }>;
    }
  >();
  for (const row of rows) {
    if (!wards.has(row.ward_id)) {
      wards.set(row.ward_id, {
        id: row.ward_id,
        name: row.ward_name,
        type: row.ward_type,
        color: row.ward_color,
        department: row.department,
        rooms: new Map(),
      });
    }
    const ward = wards.get(row.ward_id)!;
    if (!ward.rooms.has(row.room_id)) ward.rooms.set(row.room_id, { id: row.room_id, code: row.room_code, beds: [] });
    ward.rooms.get(row.room_id)!.beds.push({
      id: row.bed_id,
      code: row.bed_code,
      status: row.status,
      version: row.version,
      occupant: row.admission_id
        ? {
            admissionId: row.admission_id,
            patientId: row.patient_id,
            attendingPhysicianId: row.attending_physician_id,
            admittedAt: row.admitted_at?.toISOString() ?? null,
            status: row.admission_status,
          }
        : null,
    });
  }
  return [...wards.values()].map((ward) => {
    const rooms = [...ward.rooms.values()];
    const beds = rooms.flatMap((room) => room.beds as { status: string }[]);
    return {
      id: ward.id,
      name: ward.name,
      type: ward.type,
      color: ward.color,
      department: ward.department,
      capacity: beds.length,
      occupied: beds.filter((bed) => bed.status === "Occupied").length,
      available: beds.filter((bed) => bed.status === "Available").length,
      rooms,
    };
  });
}

@Injectable()
export class BedsService {
  constructor(
    private readonly beds: BedsRepository,
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  async board(includeOccupants: boolean) {
    return toBoard(await this.beds.board(includeOccupants));
  }

  // ─── US-44: the System Administrator sets up the hospital's layout ───

  async createWard(body: CreateWardDto, admin: AuthUser) {
    try {
      await this.database.query(
        "INSERT INTO wards (id, name, type, color, department) VALUES ($1, $2, $3, $4, $5)",
        [body.id, body.name.trim(), body.type, body.color, body.department.trim()],
      );
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) throw new ConflictException(`Ward ${body.id} already exists.`);
      throw error;
    }
    this.bus.publish(EVENT_TYPES.wardConfigured, { wardId: body.id, change: "Created" }, admin);
    return { id: body.id };
  }

  async updateWard(id: string, body: UpdateWardDto, admin: AuthUser) {
    if (body.isActive === false) {
      const occupied = await this.database.one<{ count: string }>(
        `SELECT count(*) FROM beds b JOIN rooms r ON r.id = b.room_id WHERE r.ward_id = $1 AND b.status = 'Occupied'`,
        [id],
      );
      if (Number(occupied?.count ?? 0) > 0) throw new ConflictException("Patients are still in this ward. Transfer them first.");
    }
    const updated = await this.database.one<{ id: string }>(
      `UPDATE wards SET name = coalesce($2, name), department = coalesce($3, department),
                        is_active = coalesce($4, is_active)
        WHERE id = $1 RETURNING id`,
      [id, body.name?.trim() ?? null, body.department?.trim() ?? null, body.isActive ?? null],
    );
    if (!updated) throw new NotFoundException(`No ward ${id}`);
    const change = Object.keys(body).join(", ") || "nothing";
    this.bus.publish(EVENT_TYPES.wardConfigured, { wardId: id, change: `Updated ${change}` }, admin);
    return updated;
  }

  // New beds are numbered after the ward's highest, so codes never repeat
  async addRoom(wardId: string, body: CreateRoomDto, admin: AuthUser) {
    const roomId = await this.database.transaction(async (client) => {
      const ward = await client.query("SELECT id FROM wards WHERE id = $1 FOR UPDATE", [wardId]);
      if (!ward.rows[0]) throw new NotFoundException(`No ward ${wardId}`);
      const { rows } = await client.query<{ count: string }>("SELECT count(*) FROM rooms WHERE ward_id = $1", [wardId]);
      const id = `${wardId}-R${Number(rows[0].count) + 1}`;
      try {
        await client.query("INSERT INTO rooms (id, ward_id, code) VALUES ($1, $2, $3)", [id, wardId, body.code.trim()]);
      } catch (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) throw new ConflictException(`${body.code} already exists in this ward.`);
        throw error;
      }
      await this.insertBeds(client, wardId, id, body.beds, admin);
      return id;
    });
    this.bus.publish(EVENT_TYPES.wardConfigured, { wardId, change: `Added ${body.code} with ${body.beds} beds` }, admin);
    return { id: roomId };
  }

  async addBeds(roomId: string, count: number, admin: AuthUser) {
    const wardId = await this.database.transaction(async (client) => {
      const { rows } = await client.query<{ ward_id: string }>("SELECT ward_id FROM rooms WHERE id = $1", [roomId]);
      if (!rows[0]) throw new NotFoundException(`No room ${roomId}`);
      await client.query("SELECT id FROM wards WHERE id = $1 FOR UPDATE", [rows[0].ward_id]);
      await this.insertBeds(client, rows[0].ward_id, roomId, count, admin);
      return rows[0].ward_id;
    });
    this.bus.publish(EVENT_TYPES.wardConfigured, { wardId, change: `Added ${count} beds to ${roomId}` }, admin);
    return { roomId };
  }

  // Cleaning and maintenance are set by hand; Occupied only comes from an admission
  async setBedStatus(bedId: string, body: SetBedStatusDto, admin: AuthUser) {
    const fromStatus = await this.database.transaction(async (client) => {
      const { rows } = await client.query<{ status: string }>("SELECT status FROM beds WHERE id = $1 FOR UPDATE", [bedId]);
      if (!rows[0]) throw new NotFoundException(`No bed ${bedId}`);
      if (rows[0].status === "Occupied") throw new ConflictException("A patient is in this bed. Transfer or discharge them first.");
      if (rows[0].status === body.status) throw new BadRequestException(`The bed is already ${body.status}.`);
      await client.query("UPDATE beds SET status = $2, version = version + 1 WHERE id = $1", [bedId, body.status]);
      await this.beds.log(client, { bedId, from: rows[0].status, to: body.status, admissionId: null, reason: body.reason.trim(), byId: admin.id });
      return rows[0].status;
    });
    this.bus.publish(EVENT_TYPES.bedStatusChanged, { bedId, fromStatus, toStatus: body.status }, admin);
    return { bedId, status: body.status };
  }

  async history(bedId: string) {
    const rows = await this.beds.history(bedId);
    return rows.map((row) => ({
      fromStatus: row.from_status,
      toStatus: row.to_status,
      admissionId: row.admission_id,
      reason: row.reason,
      changedById: row.changed_by_id,
      changedAt: row.changed_at.toISOString(),
    }));
  }

  private async insertBeds(
    client: Parameters<Parameters<Database["transaction"]>[0]>[0],
    wardId: string,
    roomId: string,
    count: number,
    admin: AuthUser,
  ) {
    const prefix = wardId.replace("-", "");
    const { rows } = await client.query<{ highest: number | null }>(
      `SELECT max(substring(b.code FROM '-(\\d+)$')::int) AS highest
         FROM beds b JOIN rooms r ON r.id = b.room_id WHERE r.ward_id = $1`,
      [wardId],
    );
    let next = (rows[0].highest ?? 0) + 1;
    for (let created = 0; created < count; created++, next++) {
      const code = `${prefix}-${String(next).padStart(2, "0")}`;
      await client.query("INSERT INTO beds (id, room_id, code) VALUES ($1, $2, $3)", [`BED-${code}`, roomId, code]);
      await this.beds.log(client, { bedId: `BED-${code}`, from: null, to: "Available", admissionId: null, reason: "Bed added", byId: admin.id });
    }
  }
}
