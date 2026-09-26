// MEWS scoring bands and plausibility ranges, kept in one file so the ward
// can tune them without touching the scoring code (UC-05 BR-02: thresholds
// are configurable, not hardcoded).
//
// WARNING: placeholder clinical values for the prototype. The five classic
// bands follow Subbe et al. (2001), the paper's MEWS reference [4]. The SpO2
// band is borrowed from common EWS practice since the paper adds SpO2 as a
// sixth parameter. Verify every number with Concepcion District Hospital
// before any real use.

// A band matches when the value is >= min and < max (either side optional).
export interface ScoreBand {
  min?: number;
  max?: number;
  points: number;
}

export const RESPIRATORY_RATE_BANDS: ScoreBand[] = [
  { max: 9, points: 2 },
  { min: 9, max: 15, points: 0 },
  { min: 15, max: 21, points: 1 },
  { min: 21, max: 30, points: 2 },
  { min: 30, points: 3 },
];

export const HEART_RATE_BANDS: ScoreBand[] = [
  { max: 41, points: 2 },
  { min: 41, max: 51, points: 1 },
  { min: 51, max: 101, points: 0 },
  { min: 101, max: 111, points: 1 },
  { min: 111, max: 130, points: 2 },
  { min: 130, points: 3 },
];

export const SYSTOLIC_BP_BANDS: ScoreBand[] = [
  { max: 71, points: 3 },
  { min: 71, max: 81, points: 2 },
  { min: 81, max: 101, points: 1 },
  { min: 101, max: 200, points: 0 },
  { min: 200, points: 2 },
];

export const TEMPERATURE_BANDS: ScoreBand[] = [
  { max: 35, points: 2 },
  { min: 35, max: 38.5, points: 0 },
  { min: 38.5, points: 2 },
];

export const SPO2_BANDS: ScoreBand[] = [
  { max: 92, points: 3 },
  { min: 92, max: 94, points: 2 },
  { min: 94, max: 96, points: 1 },
  { min: 96, points: 0 },
];

// AVPU scale for level of consciousness
export const CONSCIOUSNESS_POINTS = {
  Alert: 0,
  Voice: 1,
  Pain: 2,
  Unresponsive: 3,
} as const;

// Total score → risk level. Medium and High both raise an alert (UC-08).
export const RISK_THRESHOLDS = {
  medium: 3,
  high: 5,
} as const;

// Outside these, the reading is probably a typo (e.g. HR 400), so the nurse
// has to confirm it before saving (paper scope g, UC-05 extension 4a).
export const PLAUSIBLE_RANGES = {
  respiratoryRate: { min: 4, max: 60, unit: "/min" },
  oxygenSaturation: { min: 50, max: 100, unit: "%" },
  temperature: { min: 30, max: 43, unit: "°C" },
  systolicBp: { min: 50, max: 260, unit: "mmHg" },
  heartRate: { min: 20, max: 250, unit: "bpm" },
} as const;

// Highest possible total with the bands above (3+3+2+3+3+3), used to size
// the MEWS bar on patient cards.
export const MAX_MEWS_SCORE = 17;
