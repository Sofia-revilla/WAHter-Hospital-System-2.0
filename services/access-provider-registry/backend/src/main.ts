import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "access-provider-registry",
  title: "Access & Provider Registry Service",
  description: "Staff login (JWT), roles and permissions, and the provider registry (UC-08).",
});
