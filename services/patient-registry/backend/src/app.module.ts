import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { PatientsController } from "./patients/patients.controller";
import { PatientsRepository } from "./patients/patients.repository";
import { PatientsService } from "./patients/patients.service";

@Module({
  imports: [WahServiceModule.register({ name: "patient-registry", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [PatientsController],
  providers: [PatientsRepository, PatientsService],
})
export class AppModule {}
