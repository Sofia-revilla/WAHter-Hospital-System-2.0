import { apiGet, apiPost, timeAgo } from "@/lib/api";
import type { FormularyItem, LabTest, MedicationOrder } from "@/types";

// Calls to the Orders & Diagnostics service (services/orders-diagnostics/backend)

interface DiagnosticOrderResponse {
  id: string;
  patientId: string;
  patient: string;
  test: string;
  priority: LabTest["priority"];
  status: LabTest["status"];
  isCritical: boolean;
  orderedAt: string;
}

function toLabTest(order: DiagnosticOrderResponse): LabTest {
  return {
    id: order.id,
    patientId: order.patientId,
    patient: order.patient,
    test: order.test,
    priority: order.priority,
    status: order.status,
    time: timeAgo(order.orderedAt),
    isCritical: order.isCritical,
  };
}

export const fetchFormulary = () => apiGet<FormularyItem[]>("orders-diagnostics", "/formulary");

export const fetchMedicationOrders = () => apiGet<MedicationOrder[]>("orders-diagnostics", "/medication-orders");

// the prescriber isn't sent: the service takes it from the signed-in token
export const postMedicationOrder = (order: {
  patientId: string;
  drug: string;
  dose: string;
  frequency: string;
  route?: string;
  duration?: string;
  instructions?: string;
}) => apiPost<MedicationOrder>("orders-diagnostics", "/medication-orders", order);

// Pharmacist only (UC-10). Billing charges the drug from the event this publishes.
export const postDispense = (orderId: string, quantity: number, note?: string) =>
  apiPost<MedicationOrder>("orders-diagnostics", `/medication-orders/${orderId}/dispense`, { quantity, note });

export async function fetchDiagnosticOrders() {
  const orders = await apiGet<DiagnosticOrderResponse[]>("orders-diagnostics", "/diagnostic-orders");
  return orders.map(toLabTest);
}

export async function postDiagnosticOrder(order: {
  patientId: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: LabTest["priority"];
}) {
  return toLabTest(await apiPost<DiagnosticOrderResponse>("orders-diagnostics", "/diagnostic-orders", order));
}
