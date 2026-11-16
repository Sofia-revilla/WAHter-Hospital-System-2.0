import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { FhirController } from "./fhir/fhir.controller";
import { ReportsController } from "./reports/reports.controller";

@Module({
  imports: [
    WahServiceModule.register({ name: "interoperability-reporting", migrationsDir: join(__dirname, "..", "db") }),
  ],
  controllers: [FhirController, ReportsController],
})
export class AppModule {}
