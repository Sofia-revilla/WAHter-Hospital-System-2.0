import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "pharmacy",
  title: "Pharmacy Service",
  description: "Prescriptions, the formulary, and dispensing (UC-04). Dispensing only, no stock.",
});
