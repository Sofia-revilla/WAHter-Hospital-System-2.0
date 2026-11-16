import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { ExchangeStatusConsumer } from "./patients/exchange-status.consumer";
import { PatientsController } from "./patients/patients.controller";
import { PatientsRepository } from "./patients/patients.repository";
import { PatientsService } from "./patients/patients.service";
import { ReviewsController } from "./reviews/reviews.controller";
import { ReviewsService } from "./reviews/reviews.service";

@Module({
  imports: [WahServiceModule.register({ name: "patient-registry", migrationsDir: join(__dirname, "..", "db") })],
  controllers: [PatientsController, ReviewsController],
  providers: [PatientsRepository, PatientsService, ExchangeStatusConsumer, ReviewsService],
})
export class AppModule {}
