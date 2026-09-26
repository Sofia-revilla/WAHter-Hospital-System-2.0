import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { ChargeCaptureConsumer } from "./charges/charge-capture.consumer";
import { ChargesController } from "./charges/charges.controller";
import { ChargesRepository } from "./charges/charges.repository";

@Module({
  imports: [WahServiceModule.register({ name: "billing", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [ChargesController],
  providers: [ChargesRepository, ChargeCaptureConsumer],
})
export class AppModule {}
