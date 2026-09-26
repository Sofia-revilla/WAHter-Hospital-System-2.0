import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { PatientsController } from "./patients/patients.controller";
import { PatientsRepository } from "./patients/patients.repository";
import { PatientsService } from "./patients/patients.service";
import { StaffController } from "./staff/staff.controller";
import { StaffRepository } from "./staff/staff.repository";

@Module({
  imports: [WahServiceModule.register({ name: "identity", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [AuthController, StaffController, PatientsController],
  providers: [AuthService, StaffRepository, PatientsRepository, PatientsService],
})
export class AppModule {}
