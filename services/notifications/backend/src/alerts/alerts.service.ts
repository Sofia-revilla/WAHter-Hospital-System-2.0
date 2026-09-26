import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser, type MewsAlertPayload } from "@wahter/shared";
import { AlertsRepository, type AlertRow } from "./alerts.repository";

// UC-08 BR-02: a High alert nobody acknowledges within this window escalates
// to the charge nurse / attending. Placeholder until CDH sets its own policy.
const ESCALATE_AFTER_MINUTES = 15;
const ESCALATION_CHECK_MS = 60_000;

// Same shape as the web app's MewsAlert
function toMewsAlert(row: AlertRow) {
  return {
    id: row.id,
    vitalsId: row.vitals_id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    mewsScore: row.mews_score,
    risk: row.risk,
    raisedAt: row.raised_at.toISOString(),
    acknowledgedAt: row.acknowledged_at?.toISOString(),
    acknowledgedBy: row.acknowledged_by ?? undefined,
    note: row.note ?? undefined,
    isFalseAlarm: row.is_false_alarm ?? undefined,
    escalatedAt: row.escalated_at?.toISOString(),
  };
}

@Injectable()
export class AlertsService implements OnModuleInit, OnModuleDestroy {
  private escalationTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly alerts: AlertsRepository,
    private readonly bus: EventBus,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      "notifications.mews",
      ["mews.alert.*"],
      async (event) => this.alerts.raise(event.data as MewsAlertPayload),
    );
    this.escalationTimer = setInterval(() => void this.escalateStaleAlerts(), ESCALATION_CHECK_MS);
  }

  onModuleDestroy() {
    if (this.escalationTimer) clearInterval(this.escalationTimer);
  }

  async list(limit: number) {
    return (await this.alerts.findRecent(limit)).map(toMewsAlert);
  }

  async acknowledge(id: string, body: { note?: string; isFalseAlarm?: boolean }, user: AuthUser) {
    const row = await this.alerts.acknowledge(id, {
      by: user.name,
      byId: user.id,
      note: body.note?.trim() || null,
      isFalseAlarm: body.isFalseAlarm ?? false,
    });
    if (!row) {
      const existing = await this.alerts.findById(id);
      if (!existing) throw new NotFoundException(`No alert ${id}`);
      throw new ConflictException(`Already acknowledged by ${existing.acknowledged_by}`);
    }
    this.bus.publish(
      EVENT_TYPES.alertAcknowledged,
      { alertId: row.id, patientId: row.patient_id, isFalseAlarm: row.is_false_alarm ?? false },
      user,
    );
    return toMewsAlert(row);
  }

  // TODO(Phase 2): page the charge nurse (SMS/push). For now escalation
  // just stamps the alert, which the web shows as "Escalated".
  private async escalateStaleAlerts() {
    try {
      const escalated = await this.alerts.markEscalated(ESCALATE_AFTER_MINUTES);
      for (const alert of escalated) {
        console.log(`[notifications] escalated ${alert.id} (${alert.patient_id}, MEWS ${alert.mews_score})`);
      }
    } catch (error) {
      console.error("[notifications] escalation check failed", error);
    }
  }
}
