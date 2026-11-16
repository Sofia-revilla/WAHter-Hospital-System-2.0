import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "diagnostics",
  title: "Diagnostics Service",
  description: "Laboratory and radiology orders and results (UC-05).",
});
