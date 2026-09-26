import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "@wahter/shared";
import { WardsRepository } from "./wards.repository";

@ApiTags("wards")
@ApiBearerAuth()
@Controller("wards")
export class WardsController {
  constructor(private readonly wards: WardsRepository) {}

  // `occupied` is only the go-live census; the web adds the active
  // admissions from GET /admissions on top, bed by bed
  @Roles("Doctor", "Nurse")
  @Get()
  async list() {
    return (await this.wards.findAll()).map((ward) => ({
      id: ward.id,
      name: ward.name,
      type: ward.type,
      capacity: ward.capacity,
      occupied: ward.census_occupied,
      color: ward.color,
    }));
  }
}
