import { join } from "node:path";
import { Module } from "@nestjs/common";
import { WahServiceModule } from "@wahter/shared";
import { AccountsController } from "./accounts/accounts.controller";
import { AccountsRepository } from "./accounts/accounts.repository";
import { AccountsService } from "./accounts/accounts.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { Mailer } from "./auth/mailer";
import { ProvidersController } from "./staff/staff.controller";
import { StaffRepository } from "./staff/staff.repository";

@Module({
  imports: [
    WahServiceModule.register({ name: "access-provider-registry", migrationsDir: join(__dirname, "..", "db") }),
  ],
  controllers: [AuthController, AccountsController, ProvidersController],
  providers: [AuthService, Mailer, AccountsRepository, AccountsService, StaffRepository],
})
export class AppModule {}
