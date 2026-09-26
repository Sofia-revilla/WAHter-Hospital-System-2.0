import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "audit-log",
  title: "Audit Log Service",
  description: "Append-only audit trail of every event on the bus (UC-16).",
});
