import { Injectable } from "@nestjs/common";
import { Database, type StaffRole } from "@wahter/shared";

export interface StaffRow {
  id: string;
  name: string;
  role: StaffRole;
  department: string;
  license: string | null;
  password_hash: string | null;
  status: "Active" | "Deactivated";
  is_prototype_account: boolean;
  last_login_at: Date | null;
}

// Data access only. Rules about who may log in live in AuthService.
@Injectable()
export class StaffRepository {
  constructor(private readonly database: Database) {}

  findAll() {
    return this.database.query<StaffRow>(
      "SELECT * FROM staff WHERE is_prototype_account = false ORDER BY id",
    );
  }

  // Dr./RN prefixes are ignored, so "Andrea Mendoza" finds "Dr. Andrea Mendoza"
  findByRoleAndName(role: StaffRole, name: string) {
    return this.database.one<StaffRow>(
      `SELECT * FROM staff
        WHERE role = $1
          AND regexp_replace(lower(name), '^(dr\\.|rn)\\s+', '') = regexp_replace(lower($2), '^(dr\\.|rn)\\s+', '')`,
      [role, name.trim()],
    );
  }

  findPrototypeAccount(role: StaffRole) {
    return this.database.one<StaffRow>(
      "SELECT * FROM staff WHERE role = $1 AND is_prototype_account = true",
      [role],
    );
  }

  // The provider registry: everyone active in a role, without login details
  findProviders(role: StaffRole | undefined) {
    return this.database.query<StaffRow>(
      `SELECT * FROM staff
        WHERE status = 'Active' AND is_prototype_account = false AND ($1::text IS NULL OR role = $1)
        ORDER BY name`,
      [role ?? null],
    );
  }

  findById(id: string) {
    return this.database.one<StaffRow>("SELECT * FROM staff WHERE id = $1", [id]);
  }

  async create(account: {
    name: string;
    role: StaffRole;
    department: string;
    license: string;
    passwordHash: string;
  }) {
    return this.database.one<StaffRow>(
      `INSERT INTO staff (id, name, role, department, license, password_hash)
       VALUES ('EMP-' || lpad(nextval('staff_number')::text, 4, '0'), $1, $2, $3, $4, $5)
       RETURNING *`,
      [account.name, account.role, account.department, account.license, account.passwordHash],
    );
  }

  async touchLastLogin(id: string) {
    await this.database.query("UPDATE staff SET last_login_at = now() WHERE id = $1", [id]);
  }
}
