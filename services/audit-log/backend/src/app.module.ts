import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AuditConsumer } from "./entries/audit.consumer";
import { EntriesController } from "./entries/entries.controller";
import { EntriesRepository } from "./entries/entries.repository";
import { GatewayLogController } from "./entries/gateway-log.controller";

@Module({
  imports: [WahServiceModule.register({ name: "audit-log", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [EntriesController, GatewayLogController],
  providers: [EntriesRepository, AuditConsumer],
})
export class AppModule {}
