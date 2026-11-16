import { apiGet, apiPost } from "@/lib/api";
import type { MewsAlert } from "@/types";

// Calls to the Notifications service (services/notifications/backend).
// Alerts are only ever created by the service itself, from Clinical Care's
// clinical.mews.alert events, so there's no "create alert" call here.

// What the service sends: IDs only. DataContext adds the names.
export type MewsAlertRecord = Omit<MewsAlert, "patientName" | "acknowledgedBy">;

export const fetchAlerts = () => apiGet<MewsAlertRecord[]>("notifications", "/alerts");

export const postAcknowledgement = (alertId: string, body: { note?: string; isFalseAlarm: boolean }) =>
  apiPost<MewsAlertRecord>("notifications", `/alerts/${alertId}/acknowledge`, body);
