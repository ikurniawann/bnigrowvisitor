import { DEFAULT_TARGETS } from './config'
import type { ChapterStats, ChapterTarget, KpiProgress } from './types'

export function resolveTarget(override?: Partial<ChapterTarget> | null): ChapterTarget {
  return {
    visitors_per_meeting: override?.visitors_per_meeting ?? DEFAULT_TARGETS.visitors_per_meeting,
    member_conversion_pct: override?.member_conversion_pct ?? DEFAULT_TARGETS.member_conversion_pct,
    min_active_pic: override?.min_active_pic ?? DEFAULT_TARGETS.min_active_pic,
    min_weekly_meetings_per_month:
      override?.min_weekly_meetings_per_month ?? DEFAULT_TARGETS.min_weekly_meetings_per_month,
  }
}

function pct(actual: number, target: number): number {
  if (target <= 0) return 100
  return Math.min(100, Math.round((actual / target) * 100))
}

// Computes KPI progress for a chapter against its resolved target.
export function computeKpiProgress(stats: ChapterStats, target: ChapterTarget): KpiProgress[] {
  const visitorsPerMeeting =
    stats.meetingsLast30 > 0 ? Math.round(stats.totalVisitors / stats.meetingsLast30) : stats.totalVisitors
  const conversion = stats.totalVisitors > 0 ? Math.round((stats.members / stats.totalVisitors) * 100) : 0

  return [
    {
      key: 'visitors_per_meeting',
      label: 'Visitor / Meeting',
      target: target.visitors_per_meeting,
      actual: visitorsPerMeeting,
      pct: pct(visitorsPerMeeting, target.visitors_per_meeting),
      met: visitorsPerMeeting >= target.visitors_per_meeting,
      unit: '',
    },
    {
      key: 'member_conversion_pct',
      label: 'Konversi Member',
      target: target.member_conversion_pct,
      actual: conversion,
      pct: pct(conversion, target.member_conversion_pct),
      met: conversion >= target.member_conversion_pct,
      unit: '%',
    },
    {
      key: 'min_active_pic',
      label: 'PIC Aktif',
      target: target.min_active_pic,
      actual: stats.picCount,
      pct: pct(stats.picCount, target.min_active_pic),
      met: stats.picCount >= target.min_active_pic,
      unit: '',
    },
    {
      key: 'min_weekly_meetings_per_month',
      label: 'Weekly Meeting / Bln',
      target: target.min_weekly_meetings_per_month,
      actual: stats.meetingsLast30,
      pct: pct(stats.meetingsLast30, target.min_weekly_meetings_per_month),
      met: stats.meetingsLast30 >= target.min_weekly_meetings_per_month,
      unit: '',
    },
  ]
}
