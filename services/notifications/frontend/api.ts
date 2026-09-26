import { apiGet, apiPost } from "@/lib/api";
import type { MewsAlert } from "@/types";

// Calls to the Notifications service (services/notifications/backend).
// Alerts are only ever created by the service itself, from Clinical Records'
// MEWS events, so there's no "create alert" call here (UC-08 BR-01).

export const fetchAlerts = () => apiGet<MewsAlert[]>("notifications", "/alerts");

export const postAcknowledgement = (alertId: string, body: { note?: string; isFalseAlarm: boolean }) =>
  apiPost<MewsAlert>("notifications", `/alerts/${alertId}/acknowledge`, body);
