import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { PatientsConsumer } from "./patients/patients.consumer";
import { PatientsController } from "./patients/patients.controller";
import { PatientsRepository } from "./patients/patients.repository";
import { VitalsController } from "./vitals/vitals.controller";
import { VitalsRepository } from "./vitals/vitals.repository";
import { VitalsService } from "./vitals/vitals.service";

@Module({
  imports: [WahServiceModule.register({ name: "clinical-records", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [PatientsController, VitalsController],
  providers: [PatientsRepository, PatientsConsumer, VitalsRepository, VitalsService],
})
export class AppModule {}
