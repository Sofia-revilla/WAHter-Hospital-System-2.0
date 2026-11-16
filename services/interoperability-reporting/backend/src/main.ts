import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "interoperability-reporting",
  title: "Interoperability & Reporting Service",
  description: "FHIR R4 exchange and hospital/DOH report exports (UC-07, UC-09). Export files only, no live submission.",
});
