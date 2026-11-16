import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AdmissionsController } from "./admissions/admissions.controller";
import { AdmissionsService } from "./admissions/admissions.service";
import { BedsController, WardSetupController } from "./beds/beds.controller";
import { BedsRepository } from "./beds/beds.repository";
import { BedsService } from "./beds/beds.service";
import { SchedulingController } from "./scheduling/scheduling.controller";
import { SchedulingService } from "./scheduling/scheduling.service";

@Module({
  imports: [WahServiceModule.register({ name: "patient-flow", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [BedsController, WardSetupController, AdmissionsController, SchedulingController],
  providers: [BedsRepository, BedsService, AdmissionsService, SchedulingService],
})
export class AppModule {}
