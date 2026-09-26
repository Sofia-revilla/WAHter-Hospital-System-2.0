import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Database, Roles } from "@wahter/shared";

interface FormularyRow {
  id: string;
  name: string;
  form: string;
  is_controlled: boolean;
}

// Read-only list the prescription pad searches. Small enough that a separate
// repository class would only forward one query.
@ApiTags("formulary")
@ApiBearerAuth()
@Controller("formulary")
export class FormularyController {
  constructor(private readonly database: Database) {}

  @Roles("Doctor", "Nurse", "Pharmacist")
  @Get()
  async list() {
    const rows = await this.database.query<FormularyRow>("SELECT * FROM formulary ORDER BY name");
    return rows.map((row) => ({ id: row.id, name: row.name, form: row.form, isControlled: row.is_controlled }));
  }
}
