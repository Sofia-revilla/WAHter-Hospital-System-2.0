import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { FormularyController } from "./formulary/formulary.controller";
import { MedicationsController } from "./medications/medications.controller";
import { MedicationsRepository } from "./medications/medications.repository";
import { MedicationsService } from "./medications/medications.service";

@Module({
  imports: [WahServiceModule.register({ name: "pharmacy", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [FormularyController, MedicationsController],
  providers: [MedicationsRepository, MedicationsService],
})
export class AppModule {}
