import { apiGet, apiPost } from "@/lib/api";
import type { Charge } from "@/types";

// Calls to the Billing service (services/billing/backend). Charges are never
// created from here: Billing captures them itself from bus events (UC-12).

export const fetchCharges = () => apiGet<Charge[]>("billing", "/charges");

// Prices an unpriced line; the service logs who did it and why
export const postChargePrice = (chargeId: string, unitAmount: number, reason: string) =>
  apiPost<Charge>("billing", `/charges/${chargeId}/price`, { unitAmount, reason });
