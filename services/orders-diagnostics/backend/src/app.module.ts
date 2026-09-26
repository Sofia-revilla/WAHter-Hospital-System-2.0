import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { DiagnosticsController } from "./diagnostics/diagnostics.controller";
import { DiagnosticsRepository } from "./diagnostics/diagnostics.repository";
import { DiagnosticsService } from "./diagnostics/diagnostics.service";
import { FormularyController } from "./formulary/formulary.controller";
import { MedicationsController } from "./medications/medications.controller";
import { MedicationsRepository } from "./medications/medications.repository";
import { MedicationsService } from "./medications/medications.service";
import { PatientsDirectory } from "./patients/patients.directory";

@Module({
  imports: [WahServiceModule.register({ name: "orders-diagnostics", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [FormularyController, MedicationsController, DiagnosticsController],
  providers: [
    PatientsDirectory,
    MedicationsRepository,
    MedicationsService,
    DiagnosticsRepository,
    DiagnosticsService,
  ],
})
export class AppModule {}
