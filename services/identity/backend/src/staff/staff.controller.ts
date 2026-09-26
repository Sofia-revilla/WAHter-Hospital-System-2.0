import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "@wahter/shared";
import { StaffRepository } from "./staff.repository";

@ApiTags("staff")
@ApiBearerAuth()
@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffRepository) {}

  // UC-16: only the System Administrator manages accounts. Password hashes
  // never leave this service.
  @Roles("IT")
  @Get()
  async list() {
    const rows = await this.staff.findAll();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.hospital_role,
      department: row.department,
      status: row.status,
      lastLoginAt: row.last_login_at,
    }));
  }
}
