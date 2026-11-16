import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { isStaffRole, Roles, STAFF_ROLES } from "@wahter/shared";
import { StaffRepository } from "./staff.repository";

// The provider registry (comment matrix 1 and 3). Other services keep only a
// provider ID and look the name up here, e.g. the attending physician picker
// on the admission form.
@ApiTags("providers")
@ApiBearerAuth()
@Controller("providers")
export class ProvidersController {
  constructor(private readonly staff: StaffRepository) {}

  @Roles(...STAFF_ROLES, "System")
  @ApiQuery({ name: "role", required: false, enum: STAFF_ROLES })
  @Get()
  async list(@Query("role") role?: string) {
    if (role !== undefined && !isStaffRole(role)) throw new BadRequestException(`Unknown role ${role}`);
    const rows = await this.staff.findProviders(role);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      department: row.department,
      license: row.license,
    }));
  }
}
