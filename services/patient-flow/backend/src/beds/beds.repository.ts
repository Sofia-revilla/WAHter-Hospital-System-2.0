import { Injectable } from "@nestjs/common";
import { Database, type PoolClient } from "@wahter/shared";
import type { FreeBed } from "../flow-rules";

export type BedStatus = "Available" | "Occupied" | "Cleaning" | "Maintenance";

export interface BoardRow {
  ward_id: string;
  ward_name: string;
  ward_type: string;
  ward_color: string;
  department: string;
  room_id: string;
  room_code: string;
  bed_id: string;
  bed_code: string;
  status: BedStatus;
  version: number;
  admission_id: string | null;
  patient_id: string | null;
  attending_physician_id: string | null;
  admitted_at: Date | null;
  admission_status: string | null;
}

export interface BedRow {
  id: string;
  code: string;
  room_id: string;
  ward_id: string;
  department: string;
  ward_type: string;
  status: BedStatus;
  current_admission_id: string | null;
  version: number;
}

export class BedUnavailableError extends Error {}

@Injectable()
export class BedsRepository {
  constructor(private readonly database: Database) {}

  // The whole board in one query: every active ward, room, and bed, with
  // whoever is in it (IDs only; names come from the registries)
  board(includeOccupants: boolean) {
    return this.database.query<BoardRow>(
      `SELECT w.id AS ward_id, w.name AS ward_name, w.type AS ward_type, w.color AS ward_color, w.department,
              r.id AS room_id, r.code AS room_code, b.id AS bed_id, b.code AS bed_code, b.status, b.version,
              ${includeOccupants ? "a.id" : "NULL"} AS admission_id,
              ${includeOccupants ? "a.patient_id" : "NULL"} AS patient_id,
              ${includeOccupants ? "a.attending_physician_id" : "NULL"} AS attending_physician_id,
              ${includeOccupants ? "a.admitted_at" : "NULL::timestamptz"} AS admitted_at,
              ${includeOccupants ? "a.status" : "NULL"} AS admission_status
         FROM wards w
         JOIN rooms r ON r.ward_id = w.id
         JOIN beds b ON b.room_id = r.id
         LEFT JOIN admissions a ON a.id = b.current_admission_id
        WHERE w.is_active
        ORDER BY w.id, r.code, b.code`,
    );
  }

  findBed(bedId: string) {
    return this.database.one<BedRow>(
      `SELECT b.*, r.ward_id, w.department, w.type AS ward_type
         FROM beds b JOIN rooms r ON r.id = b.room_id JOIN wards w ON w.id = r.ward_id
        WHERE b.id = $1`,
      [bedId],
    );
  }

  freeBeds() {
    return this.database.query<{
      bed_id: string;
      code: string;
      room_code: string;
      ward_id: string;
      ward_name: string;
      ward_type: string;
      department: string;
    }>(
      `SELECT b.id AS bed_id, b.code, r.code AS room_code, w.id AS ward_id, w.name AS ward_name, w.type AS ward_type,
              w.department
         FROM beds b JOIN rooms r ON r.id = b.room_id JOIN wards w ON w.id = r.ward_id
        WHERE b.status = 'Available' AND w.is_active
        ORDER BY b.code`,
    ).then((rows): FreeBed[] =>
      rows.map((row) => ({
        bedId: row.bed_id,
        code: row.code,
        roomCode: row.room_code,
        wardId: row.ward_id,
        wardName: row.ward_name,
        wardType: row.ward_type,
        department: row.department,
      })),
    );
  }

  // Takes a bed only if it's still Available. The UPDATE locks the row, so of
  // two people claiming the same bed at the same moment the second waits,
  // then finds it Occupied and gets nothing back (UC-02 6b).
  async claim(client: PoolClient, bedId: string, admissionId: string) {
    const { rows } = await client.query<BedRow>(
      `UPDATE beds SET status = 'Occupied', current_admission_id = $2, version = version + 1
        WHERE id = $1 AND status = 'Available'
        RETURNING *`,
      [bedId, admissionId],
    );
    if (!rows[0]) throw new BedUnavailableError();
    return rows[0];
  }

  async release(client: PoolClient, bedId: string) {
    await client.query(
      `UPDATE beds SET status = 'Available', current_admission_id = NULL, version = version + 1 WHERE id = $1`,
      [bedId],
    );
  }

  async log(
    client: PoolClient,
    entry: { bedId: string; from: string | null; to: string; admissionId: string | null; reason: string; byId: string },
  ) {
    await client.query(
      `INSERT INTO bed_status_log (bed_id, from_status, to_status, admission_id, reason, changed_by_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.bedId, entry.from, entry.to, entry.admissionId, entry.reason, entry.byId],
    );
  }

  history(bedId: string) {
    return this.database.query<{
      from_status: string | null;
      to_status: string;
      admission_id: string | null;
      reason: string;
      changed_by_id: string;
      changed_at: Date;
    }>("SELECT * FROM bed_status_log WHERE bed_id = $1 ORDER BY changed_at DESC LIMIT 50", [bedId]);
  }
}
