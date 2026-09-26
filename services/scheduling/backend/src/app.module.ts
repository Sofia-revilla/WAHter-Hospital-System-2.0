import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AdmissionsController } from "./admissions/admissions.controller";
import { AdmissionsRepository } from "./admissions/admissions.repository";
import { AdmissionsService } from "./admissions/admissions.service";
import { WardsController } from "./wards/wards.controller";
import { WardsRepository } from "./wards/wards.repository";

@Module({
  imports: [WahServiceModule.register({ name: "scheduling", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [WardsController, AdmissionsController],
  providers: [WardsRepository, AdmissionsRepository, AdmissionsService],
})
export class AppModule {}
