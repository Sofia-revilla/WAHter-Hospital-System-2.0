import { apiGet, apiPost } from "@/lib/api";
import type { Charge } from "@/types";

// Calls to the Billing & Revenue Cycle service (services/billing-revenue-cycle/backend).
// Charges are never created from here: the service captures them itself from
// bus events (UC-06 2a to 2c).

// What the service sends: the patient ID only. DataContext adds the name.
export type ChargeRecord = Omit<Charge, "patientName">;

export const fetchCharges = () => apiGet<ChargeRecord[]>("billing-revenue-cycle", "/charges");

// Prices an unpriced line; the service logs who did it and why
export const postChargePrice = (chargeId: string, unitAmount: number, reason: string) =>
  apiPost<ChargeRecord>("billing-revenue-cycle", `/charges/${chargeId}/price`, { unitAmount, reason });
