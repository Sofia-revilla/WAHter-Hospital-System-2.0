import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { ExchangeService } from "./exchange/exchange.service";
import { FhirController } from "./fhir/fhir.controller";
import { ReportsController } from "./reports/reports.controller";

@Module({
  imports: [
    WahServiceModule.register({ name: "interoperability-reporting", migrationsDir: join(__dirname, "..", "db") }),
  ],
  controllers: [FhirController, ReportsController],
  providers: [ExchangeService],
})
export class AppModule {}
