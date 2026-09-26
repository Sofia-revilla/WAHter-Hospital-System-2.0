import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "identity",
  title: "Identity Service",
  description: "Staff login (JWT), role-based access, and the Master Patient Index (UC-01, UC-16).",
});
