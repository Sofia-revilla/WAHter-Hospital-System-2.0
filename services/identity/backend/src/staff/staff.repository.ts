import { Injectable } from "@nestjs/common";
import { Database, type PortalRole } from "@wahter/shared";

export interface StaffRow {
  id: string;
  name: string;
  hospital_role: string;
  portal_role: PortalRole | null;
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
  findByPortalAndName(portal: PortalRole, name: string) {
    return this.database.one<StaffRow>(
      `SELECT * FROM staff
        WHERE portal_role = $1
          AND regexp_replace(lower(name), '^(dr\\.|rn)\\s+', '') = regexp_replace(lower($2), '^(dr\\.|rn)\\s+', '')`,
      [portal, name.trim()],
    );
  }

  findPrototypeAccount(portal: PortalRole) {
    return this.database.one<StaffRow>(
      "SELECT * FROM staff WHERE portal_role = $1 AND is_prototype_account = true",
      [portal],
    );
  }

  findById(id: string) {
    return this.database.one<StaffRow>("SELECT * FROM staff WHERE id = $1", [id]);
  }

  async create(account: {
    name: string;
    hospitalRole: string;
    portal: PortalRole;
    department: string;
    license: string;
    passwordHash: string;
  }) {
    return this.database.one<StaffRow>(
      `INSERT INTO staff (id, name, hospital_role, portal_role, department, license, password_hash)
       VALUES ('EMP-' || lpad(nextval('staff_number')::text, 4, '0'), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [account.name, account.hospitalRole, account.portal, account.department, account.license, account.passwordHash],
    );
  }

  async touchLastLogin(id: string) {
    await this.database.query("UPDATE staff SET last_login_at = now() WHERE id = $1", [id]);
  }
}
