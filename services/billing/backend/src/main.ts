import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "billing",
  title: "Billing Service",
  description: "Charge capture from admissions and orders (UC-12, UC-13).",
});
