import { apiGet, apiPost } from "@/lib/api";
import type { LabTest } from "@/types";

// Calls to the Diagnostics service (services/diagnostics/backend)

// What the service sends: IDs only. DataContext adds the patient's name and
// turns orderedAt into the "10m ago" label.
export interface DiagnosticOrderRecord {
  id: string;
  patientId: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: LabTest["priority"];
  status: LabTest["status"];
  isCritical: boolean;
  orderedById: string;
  orderedAt: string;
  resultedAt: string | null;
}

export const fetchDiagnosticOrders = () => apiGet<DiagnosticOrderRecord[]>("diagnostics", "/diagnostic-orders");

export const postDiagnosticOrder = (order: {
  patientId: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: LabTest["priority"];
}) => apiPost<DiagnosticOrderRecord>("diagnostics", "/diagnostic-orders", order);
