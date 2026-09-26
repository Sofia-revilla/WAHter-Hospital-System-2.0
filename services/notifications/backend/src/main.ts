import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "notifications",
  title: "Notifications Service",
  description: "MEWS alerts, acknowledgment, and escalation (UC-08).",
});
