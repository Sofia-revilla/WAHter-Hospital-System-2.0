import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "clinical-records",
  title: "Clinical Records Service",
  description: "Inpatient census, vital signs charting, and MEWS scoring (UC-05, UC-06).",
});
