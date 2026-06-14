// Tunable configuration for national analytics: health score weights, reference
// targets, and alert thresholds. Kept in one place so HQ can recalibrate without
// touching the computation logic.

// Health score component weights. Must sum to 1.0.
export const HEALTH_WEIGHTS = {
  attendance: 0.25,
  conversion: 0.25,
  dataQuality: 0.2,
  picCoverage: 0.15,
  meeting: 0.15,
} as const

// Reference targets that map a raw rate to a full (100) component score.
export const HEALTH_TARGETS = {
  // Of visitors who committed (confirmed or beyond), share who actually attended.
  attendanceRate: 0.7,
  // Share of all visitors that convert into members.
  memberConversion: 0.15,
  // Expected meetings within the rolling 30-day window (≈ weekly).
  meetingsPer30Days: 4,
} as const

// Health grade bands keyed by minimum score. Evaluated high → low.
export const HEALTH_GRADES = [
  { min: 85, grade: 'A', label: 'Sehat', tone: 'emerald' },
  { min: 70, grade: 'B', label: 'Baik', tone: 'green' },
  { min: 55, grade: 'C', label: 'Cukup', tone: 'amber' },
  { min: 40, grade: 'D', label: 'Perlu Perhatian', tone: 'orange' },
  { min: 0, grade: 'E', label: 'Kritis', tone: 'red' },
] as const

// Visitor fields that count toward the data-quality completeness score.
export const DATA_QUALITY_FIELDS = ['phone', 'business_field', 'company', 'email'] as const

// Alert thresholds (days / counts).
export const ALERT_THRESHOLDS = {
  // No meeting within this many days → "weekly meeting tidak aktif".
  staleMeetingDays: 14,
  // No activity log within this many days → "chapter tidak aktif".
  inactiveChapterDays: 7,
  // Airtime-qualified visitor still un-followed-up after this many days.
  unfollowedQualifiedDays: 7,
  // Absolute count of unassigned visitors that triggers a warning.
  unassignedVisitorCount: 5,
  // Data-quality percentage below which a chapter is flagged.
  poorDataQualityPct: 50,
} as const

// Fallback KPI targets used when no national-default row exists in the DB.
// Mirrors the column defaults in migration 012.
export const DEFAULT_TARGETS = {
  visitors_per_meeting: 10,
  member_conversion_pct: 15,
  min_active_pic: 3,
  min_weekly_meetings_per_month: 4,
} as const

export type AlertSeverity = 'critical' | 'warning' | 'info'
