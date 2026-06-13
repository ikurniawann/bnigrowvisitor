import { ALERT_THRESHOLDS } from './config'
import type { ChapterReport, NationalAlert } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return null
  return (now - time) / DAY_MS
}

// Derives the national alert feed from per-chapter reports. Each chapter can
// raise multiple alerts; severity ordering is applied by the caller.
export function deriveAlerts(chapters: ChapterReport[], now: number): NationalAlert[] {
  const alerts: NationalAlert[] = []

  for (const chapter of chapters) {
    const { stats } = chapter
    const base = { chapterId: chapter.id, chapterName: chapter.displayName }

    if (!stats.hasAdmin) {
      alerts.push({
        ...base,
        id: `${chapter.id}:no-admin`,
        severity: 'critical',
        type: 'no_admin',
        message: `${chapter.displayName} belum memiliki chapter admin.`,
      })
    }

    const meetingAge = daysSince(stats.lastMeetingDate, now)
    if (meetingAge == null || meetingAge >= ALERT_THRESHOLDS.staleMeetingDays) {
      alerts.push({
        ...base,
        id: `${chapter.id}:stale-meeting`,
        severity: 'warning',
        type: 'stale_meeting',
        message:
          meetingAge == null
            ? `${chapter.displayName} belum punya weekly meeting tercatat.`
            : `${chapter.displayName} tidak ada weekly meeting ${Math.floor(meetingAge)} hari terakhir.`,
      })
    }

    if (stats.unassigned >= ALERT_THRESHOLDS.unassignedVisitorCount) {
      alerts.push({
        ...base,
        id: `${chapter.id}:unassigned`,
        severity: 'warning',
        type: 'unassigned_visitors',
        count: stats.unassigned,
        message: `${stats.unassigned} visitor di ${chapter.displayName} belum di-assign PIC.`,
      })
    }

    if (stats.totalVisitors > 0 && stats.dataQualityPct < ALERT_THRESHOLDS.poorDataQualityPct) {
      alerts.push({
        ...base,
        id: `${chapter.id}:data-quality`,
        severity: 'warning',
        type: 'poor_data_quality',
        count: stats.dataQualityPct,
        message: `Kualitas data ${chapter.displayName} rendah (${stats.dataQualityPct}% lengkap).`,
      })
    }

    if (stats.unfollowedQualified > 0) {
      alerts.push({
        ...base,
        id: `${chapter.id}:unfollowed-qualified`,
        severity: 'warning',
        type: 'unfollowed_qualified',
        count: stats.unfollowedQualified,
        message: `${stats.unfollowedQualified} MCQA qualified di ${chapter.displayName} belum di-follow up.`,
      })
    }

    const activityAge = daysSince(stats.lastActivityAt, now)
    if (activityAge == null || activityAge >= ALERT_THRESHOLDS.inactiveChapterDays) {
      alerts.push({
        ...base,
        id: `${chapter.id}:inactive`,
        severity: 'info',
        type: 'inactive_chapter',
        message:
          activityAge == null
            ? `${chapter.displayName} belum ada aktivitas tercatat.`
            : `${chapter.displayName} tidak ada aktivitas ${Math.floor(activityAge)} hari terakhir.`,
      })
    }
  }

  const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}
