import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AlertsController } from "./alerts/alerts.controller";
import { AlertsRepository } from "./alerts/alerts.repository";
import { AlertsService } from "./alerts/alerts.service";

@Module({
  imports: [WahServiceModule.register({ name: "notifications", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [AlertsController],
  providers: [AlertsRepository, AlertsService],
})
export class AppModule {}
