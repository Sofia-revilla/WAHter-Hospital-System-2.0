import { Injectable } from "@nestjs/common";
import { Database, type MewsAlertPayload } from "@wahter/shared";

export interface AlertRow {
  id: string;
  vitals_id: string;
  patient_id: string;
  mews_score: number;
  risk: "Medium" | "High";
  raised_at: Date;
  acknowledged_at: Date | null;
  acknowledged_by_id: string | null;
  note: string | null;
  is_false_alarm: boolean | null;
  escalated_at: Date | null;
}

@Injectable()
export class AlertsRepository {
  constructor(private readonly database: Database) {}

  findRecent(limit: number) {
    return this.database.query<AlertRow>("SELECT * FROM alerts ORDER BY raised_at DESC LIMIT $1", [limit]);
  }

  findById(id: string) {
    return this.database.one<AlertRow>("SELECT * FROM alerts WHERE id = $1", [id]);
  }

  // vitals_id is unique, so the same MEWS event can't raise two alerts
  async raise(alert: MewsAlertPayload) {
    await this.database.query(
      `INSERT INTO alerts (id, vitals_id, patient_id, mews_score, risk, raised_at)
       VALUES ('AL-' || $1, $1, $2, $3, $4, $5)
       ON CONFLICT (vitals_id) DO NOTHING`,
      [alert.vitalsId, alert.patientId, alert.mewsScore, alert.risk, alert.raisedAt],
    );
  }

  // Only updates an alert nobody has acknowledged yet; returns null otherwise
  acknowledge(id: string, ack: { byId: string; note: string | null; isFalseAlarm: boolean }) {
    return this.database.one<AlertRow>(
      `UPDATE alerts
          SET acknowledged_at = now(), acknowledged_by_id = $2, note = $3, is_false_alarm = $4
        WHERE id = $1 AND acknowledged_at IS NULL
        RETURNING *`,
      [id, ack.byId, ack.note, ack.isFalseAlarm],
    );
  }

  markEscalated(olderThanMinutes: number) {
    return this.database.query<AlertRow>(
      `UPDATE alerts SET escalated_at = now()
        WHERE risk = 'High' AND acknowledged_at IS NULL AND escalated_at IS NULL
          AND raised_at < now() - make_interval(mins => $1)
        RETURNING *`,
      [olderThanMinutes],
    );
  }
}
