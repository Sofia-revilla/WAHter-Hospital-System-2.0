import { apiGet, apiPost } from "@/lib/api";
import type { FormularyItem, MedicationOrder } from "@/types";

// Calls to the Pharmacy service (services/pharmacy/backend)

// What the service sends: IDs only. DataContext adds the names.
export type MedicationOrderRecord = Omit<MedicationOrder, "patientName" | "prescribedBy" | "dispensedBy">;

export const fetchFormulary = () => apiGet<FormularyItem[]>("pharmacy", "/formulary");

export const fetchMedicationOrders = () => apiGet<MedicationOrderRecord[]>("pharmacy", "/medication-orders");

// the prescriber isn't sent: the service takes it from the signed-in token
export const postMedicationOrder = (order: {
  patientId: string;
  drug: string;
  dose: string;
  frequency: string;
  route?: string;
  duration?: string;
  instructions?: string;
}) => apiPost<MedicationOrderRecord>("pharmacy", "/medication-orders", order);

// Pharmacist only (UC-04). Billing charges the drug from the event this publishes.
export const postDispense = (orderId: string, quantity: number, note?: string) =>
  apiPost<MedicationOrderRecord>("pharmacy", `/medication-orders/${orderId}/dispense`, { quantity, note });
