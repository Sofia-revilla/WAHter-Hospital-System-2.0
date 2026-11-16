import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "clinical-care",
  title: "Clinical Care Service",
  description: "Encounters, vital signs charting, and MEWS scoring (UC-03).",
});
