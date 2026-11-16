import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { EncountersConsumer } from "./encounters/encounters.consumer";
import { EncountersController } from "./encounters/encounters.controller";
import { EncountersRepository } from "./encounters/encounters.repository";
import { VitalsController } from "./vitals/vitals.controller";
import { VitalsRepository } from "./vitals/vitals.repository";
import { VitalsService } from "./vitals/vitals.service";

@Module({
  imports: [WahServiceModule.register({ name: "clinical-care", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [EncountersController, VitalsController],
  providers: [EncountersRepository, EncountersConsumer, VitalsRepository, VitalsService],
})
export class AppModule {}
