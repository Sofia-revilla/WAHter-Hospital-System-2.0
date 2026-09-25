// MEWS (Modified Early Warning Score) from the six manually entered vitals.
// Pure functions only, no React, so this can move into the Clinical Records
// service later without changes. The numbers live in mewsBands.ts.

import {
  CONSCIOUSNESS_POINTS,
  HEART_RATE_BANDS,
  PLAUSIBLE_RANGES,
  RESPIRATORY_RATE_BANDS,
  RISK_THRESHOLDS,
  SPO2_BANDS,
  SYSTOLIC_BP_BANDS,
  TEMPERATURE_BANDS,
  type ScoreBand,
} from "./mewsBands";

export type Consciousness = keyof typeof CONSCIOUSNESS_POINTS;
export type RiskLevel = "Low" | "Medium" | "High";

export interface VitalSigns {
  respiratoryRate: number;
  oxygenSaturation: number;
  temperature: number;
  systolicBp: number;
  heartRate: number;
  consciousness: Consciousness;
}

type NumericVital = keyof typeof PLAUSIBLE_RANGES;

export const VITAL_LABELS: Record<NumericVital, string> = {
  respiratoryRate: "Respiratory rate",
  oxygenSaturation: "Oxygen saturation",
  temperature: "Temperature",
  systolicBp: "Systolic BP",
  heartRate: "Heart rate",
};

function pointsFor(value: number, bands: ScoreBand[]) {
  const band = bands.find(
    (candidate) =>
      (candidate.min === undefined || value >= candidate.min) &&
      (candidate.max === undefined || value < candidate.max),
  );
  return band?.points ?? 0;
}

export function riskLevelFor(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.high) return "High";
  if (score >= RISK_THRESHOLDS.medium) return "Medium";
  return "Low";
}

export function calculateMews(vitals: VitalSigns) {
  const score =
    pointsFor(vitals.respiratoryRate, RESPIRATORY_RATE_BANDS) +
    pointsFor(vitals.oxygenSaturation, SPO2_BANDS) +
    pointsFor(vitals.temperature, TEMPERATURE_BANDS) +
    pointsFor(vitals.systolicBp, SYSTOLIC_BP_BANDS) +
    pointsFor(vitals.heartRate, HEART_RATE_BANDS) +
    CONSCIOUSNESS_POINTS[vitals.consciousness];

  return { score, risk: riskLevelFor(score) };
}

// Readings outside the plausible range, e.g. a heart rate of 400. The form
// shows these as a warning the nurse has to confirm, it doesn't block saving.
export function implausibleReadings(vitals: Partial<VitalSigns>) {
  return (Object.keys(PLAUSIBLE_RANGES) as NumericVital[]).filter((key) => {
    const value = vitals[key];
    if (value === undefined || Number.isNaN(value)) return false;
    const range = PLAUSIBLE_RANGES[key];
    return value < range.min || value > range.max;
  });
}
