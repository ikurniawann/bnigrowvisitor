import {
  HEALTH_WEIGHTS,
  HEALTH_TARGETS,
  HEALTH_GRADES,
  DATA_QUALITY_FIELDS,
  ALERT_THRESHOLDS,
} from './config'
import type {
  VisitorRow,
  MeetingRow,
  ChapterUserRow,
  ActivityRow,
  ChapterStats,
  ChapterHealth,
  HealthComponents,
  FunnelStep,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

// Status groupings — mirror the definitions used in Dashboard.tsx so numbers
// stay consistent across the operational and national views.
const ATTENDED_STATUSES = new Set(['attended', 'interview', 'member', 'not_continue'])
const COMMITTED_STATUSES = new Set(['confirmed', 'attended', 'interview', 'member', 'not_continue'])

export function isAttended(status: string): boolean {
  return ATTENDED_STATUSES.has(status)
}

export function isAirtimeQualified(visitor: Pick<VisitorRow, 'status' | 'attended_choice_number'>): boolean {
  if (visitor.status === 'interview' || visitor.status === 'member') return true
  return visitor.status === 'attended' && Number(visitor.attended_choice_number) === 1
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function fieldFilled(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value != null
}

function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return null
  return (now - time) / DAY_MS
}

export function computeChapterStats(
  visitors: VisitorRow[],
  meetings: MeetingRow[],
  users: ChapterUserRow[],
  activities: ActivityRow[],
  now: number
): ChapterStats {
  const totalVisitors = visitors.length

  let confirmed = 0
  let attended = 0
  let airtimeQualified = 0
  let members = 0
  let withPic = 0
  let qualityAccum = 0
  let unfollowedQualified = 0

  for (const visitor of visitors) {
    if (visitor.status === 'confirmed') confirmed += 1
    if (isAttended(visitor.status)) attended += 1
    if (isAirtimeQualified(visitor)) airtimeQualified += 1
    if (visitor.status === 'member') members += 1
    if (fieldFilled(visitor.pic_id)) withPic += 1

    const filledFields = DATA_QUALITY_FIELDS.reduce(
      (sum, field) => sum + (fieldFilled(visitor[field]) ? 1 : 0),
      0
    )
    qualityAccum += filledFields / DATA_QUALITY_FIELDS.length

    // Airtime-qualified but still parked in 'attended' past the follow-up window.
    if (visitor.status === 'attended' && Number(visitor.attended_choice_number) === 1) {
      const age = daysSince(visitor.updated_at || visitor.created_at, now)
      if (age != null && age >= ALERT_THRESHOLDS.unfollowedQualifiedDays) {
        unfollowedQualified += 1
      }
    }
  }

  const dataQualityPct = totalVisitors > 0 ? Math.round((qualityAccum / totalVisitors) * 100) : 0
  const unassigned = totalVisitors - withPic

  let meetingsLast30 = 0
  let lastMeetingDate: string | null = null
  for (const meeting of meetings) {
    if (!meeting.meeting_date) continue
    const time = Date.parse(meeting.meeting_date)
    if (Number.isNaN(time)) continue
    if (time <= now && now - time <= 30 * DAY_MS) meetingsLast30 += 1
    if (time <= now && (!lastMeetingDate || time > Date.parse(lastMeetingDate))) {
      lastMeetingDate = meeting.meeting_date
    }
  }

  let lastActivityAt: string | null = null
  for (const activity of activities) {
    if (!activity.created_at) continue
    if (!lastActivityAt || Date.parse(activity.created_at) > Date.parse(lastActivityAt)) {
      lastActivityAt = activity.created_at
    }
  }

  const activeUsers = users.filter(user => user.is_active)
  const picCount = activeUsers.filter(user => user.role === 'pic').length
  const hasAdmin = activeUsers.some(user => user.role === 'chapter_admin')

  return {
    totalVisitors,
    confirmed,
    attended,
    airtimeQualified,
    members,
    unassigned,
    withPic,
    dataQualityPct,
    meetingsLast30,
    lastMeetingDate,
    lastActivityAt,
    picCount,
    hasAdmin,
    unfollowedQualified,
  }
}

export function computeHealthComponents(stats: ChapterStats): HealthComponents {
  const committed = stats.confirmed + stats.attended
  const attendanceRate = committed > 0 ? stats.attended / committed : 0
  const conversionRate = stats.totalVisitors > 0 ? stats.members / stats.totalVisitors : 0

  return {
    attendance: clampScore((attendanceRate / HEALTH_TARGETS.attendanceRate) * 100),
    conversion: clampScore((conversionRate / HEALTH_TARGETS.memberConversion) * 100),
    dataQuality: clampScore(stats.dataQualityPct),
    picCoverage:
      stats.picCount === 0 || stats.totalVisitors === 0
        ? 0
        : clampScore((stats.withPic / stats.totalVisitors) * 100),
    meeting: clampScore((stats.meetingsLast30 / HEALTH_TARGETS.meetingsPer30Days) * 100),
  }
}

export function pickGrade(score: number) {
  return HEALTH_GRADES.find(band => score >= band.min) || HEALTH_GRADES[HEALTH_GRADES.length - 1]
}

export function computeHealth(stats: ChapterStats): ChapterHealth {
  const components = computeHealthComponents(stats)
  const score = Math.round(
    components.attendance * HEALTH_WEIGHTS.attendance +
      components.conversion * HEALTH_WEIGHTS.conversion +
      components.dataQuality * HEALTH_WEIGHTS.dataQuality +
      components.picCoverage * HEALTH_WEIGHTS.picCoverage +
      components.meeting * HEALTH_WEIGHTS.meeting
  )
  const band = pickGrade(score)

  return {
    score,
    grade: band.grade,
    label: band.label,
    tone: band.tone,
    components,
  }
}

export function buildFunnel(visitors: VisitorRow[]): FunnelStep[] {
  let confirmed = 0
  let attended = 0
  let qualified = 0
  let members = 0

  for (const visitor of visitors) {
    if (visitor.status === 'confirmed') confirmed += 1
    if (isAttended(visitor.status)) attended += 1
    if (isAirtimeQualified(visitor)) qualified += 1
    if (visitor.status === 'member') members += 1
  }

  return [
    { key: 'visitor', label: 'Visitor', count: visitors.length },
    { key: 'confirmed', label: 'Confirmed', count: confirmed },
    { key: 'attended', label: 'Hadir', count: attended },
    { key: 'airtimeQualified', label: 'Airtime Qualified', count: qualified },
    { key: 'member', label: 'Member', count: members },
  ]
}
