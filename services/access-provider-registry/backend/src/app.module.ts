import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ProvidersController, StaffController } from "./staff/staff.controller";
import { StaffRepository } from "./staff/staff.repository";

@Module({
  imports: [
    WahServiceModule.register({ name: "access-provider-registry", migrationsDir: join(__dirname, "..", "db") }),
  ],
  controllers: [AuthController, StaffController, ProvidersController],
  providers: [AuthService, StaffRepository],
})
export class AppModule {}
