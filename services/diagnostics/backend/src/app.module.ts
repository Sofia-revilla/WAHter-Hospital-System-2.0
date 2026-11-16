import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { DiagnosticsController } from "./diagnostics/diagnostics.controller";
import { DiagnosticsRepository } from "./diagnostics/diagnostics.repository";
import { DiagnosticsService } from "./diagnostics/diagnostics.service";

@Module({
  imports: [WahServiceModule.register({ name: "diagnostics", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsRepository, DiagnosticsService],
})
export class AppModule {}
