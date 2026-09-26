import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "orders-diagnostics",
  title: "Orders & Diagnostics Service",
  description: "Medication orders, the formulary, and lab/radiology orders (UC-09, UC-10, UC-11).",
});
