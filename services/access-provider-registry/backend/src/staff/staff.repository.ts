import { Injectable } from "@nestjs/common";
import { Database, type StaffRole } from "@wahter/shared";

// One provider in the registry. Logins are separate (accounts table).
export interface StaffRow {
  id: string;
  name: string;
  role: StaffRole;
  department: string;
  license: string | null;
  status: "Active" | "Inactive";
}

@Injectable()
export class StaffRepository {
  constructor(private readonly database: Database) {}

  // Everyone active in a role. Demo providers are left out: they only exist
  // so Try Demo has someone to sign in as.
  findProviders(role: StaffRole | undefined) {
    return this.database.query<StaffRow>(
      `SELECT s.* FROM staff s
         LEFT JOIN accounts a ON a.staff_id = s.id
        WHERE s.status = 'Active' AND NOT coalesce(a.is_demo, false)
          AND ($1::text IS NULL OR s.role = $1)
        ORDER BY s.name`,
      [role ?? null],
    );
  }
}
