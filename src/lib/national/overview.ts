import { computeChapterStats, computeHealth, buildFunnel } from './metrics'
import { deriveAlerts } from './alerts'
import type {
  ChapterRow,
  VisitorRow,
  MemberRow,
  MeetingRow,
  ChapterUserRow,
  ActivityRow,
  ChapterReport,
  RankingEntry,
  RegionRollup,
  NationalOverview,
} from './types'

export interface OverviewInput {
  chapters: ChapterRow[]
  visitors: VisitorRow[]
  members: MemberRow[]
  meetings: MeetingRow[]
  users: ChapterUserRow[]
  activities: ActivityRow[]
  scope: { cityId: string | null; areaId: string | null; chapterId: string | null }
  period: { from: string | null; to: string | null; label: string }
  now: number
  generatedAt: string
}

function groupBy<T extends { chapter_id?: string | null }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    if (!row.chapter_id) continue
    const list = map.get(row.chapter_id)
    if (list) list.push(row)
    else map.set(row.chapter_id, [row])
  }
  return map
}

function rankBy(chapters: ChapterReport[], value: (chapter: ChapterReport) => number): RankingEntry[] {
  return chapters
    .map(chapter => ({ chapterId: chapter.id, displayName: chapter.displayName, value: value(chapter) }))
    .sort((a, b) => b.value - a.value || a.displayName.localeCompare(b.displayName))
}

export function assembleNationalOverview(input: OverviewInput): NationalOverview {
  const { scope, period, now, generatedAt } = input

  const inScope = input.chapters.filter(chapter => {
    if (scope.chapterId) return chapter.id === scope.chapterId
    if (scope.areaId) return chapter.area_id === scope.areaId
    if (scope.cityId) return chapter.city_id === scope.cityId
    return true
  })
  const scopeIds = new Set(inScope.map(chapter => chapter.id))

  const visitorsByChapter = groupBy(input.visitors.filter(v => v.chapter_id && scopeIds.has(v.chapter_id)))
  const membersByChapter = groupBy(input.members.filter(m => m.chapter_id && scopeIds.has(m.chapter_id)))
  const meetingsByChapter = groupBy(input.meetings.filter(m => m.chapter_id && scopeIds.has(m.chapter_id)))
  const usersByChapter = groupBy(input.users.filter(u => u.chapter_id && scopeIds.has(u.chapter_id)))
  const activitiesByChapter = groupBy(input.activities.filter(a => a.chapter_id && scopeIds.has(a.chapter_id)))

  const reports: ChapterReport[] = inScope.map(chapter => {
    const visitors = visitorsByChapter.get(chapter.id) || []
    const stats = computeChapterStats(
      visitors,
      meetingsByChapter.get(chapter.id) || [],
      usersByChapter.get(chapter.id) || [],
      activitiesByChapter.get(chapter.id) || [],
      now
    )
    return {
      id: chapter.id,
      name: chapter.name,
      displayName: chapter.display_name || chapter.name,
      areaId: chapter.area_id,
      areaName: chapter.area_name,
      cityId: chapter.city_id,
      cityName: chapter.city_name,
      isActive: chapter.is_active,
      stats,
      health: computeHealth(stats),
    }
  })

  const scopedVisitors = inScope.flatMap(chapter => visitorsByChapter.get(chapter.id) || [])
  const funnel = buildFunnel(scopedVisitors)

  const totalVisitors = reports.reduce((sum, c) => sum + c.stats.totalVisitors, 0)
  const totalConfirmed = reports.reduce((sum, c) => sum + c.stats.confirmed, 0)
  const totalAttended = reports.reduce((sum, c) => sum + c.stats.attended, 0)
  const totalQualified = reports.reduce((sum, c) => sum + c.stats.airtimeQualified, 0)
  const totalMembers = reports.reduce((sum, c) => sum + c.stats.members, 0)
  const totalCommitted = reports.reduce((sum, c) => sum + c.stats.confirmed + c.stats.attended, 0)
  const activeChapters = reports.filter(c => c.isActive).length
  const avgHealthScore = reports.length
    ? Math.round(reports.reduce((sum, c) => sum + c.health.score, 0) / reports.length)
    : 0

  const cityMap = new Map<string, RegionRollup>()
  const areaMap = new Map<string, RegionRollup>()
  for (const report of reports) {
    const city = cityMap.get(report.cityId) || {
      id: report.cityId,
      name: report.cityName,
      chapters: 0,
      visitors: 0,
      members: 0,
      avgHealth: 0,
    }
    city.chapters += 1
    city.visitors += report.stats.totalVisitors
    city.members += report.stats.members
    city.avgHealth += report.health.score
    cityMap.set(report.cityId, city)

    const area = areaMap.get(report.areaId) || {
      id: report.areaId,
      name: report.areaName,
      cityId: report.cityId,
      chapters: 0,
      visitors: 0,
      members: 0,
      avgHealth: 0,
    }
    area.chapters += 1
    area.visitors += report.stats.totalVisitors
    area.members += report.stats.members
    area.avgHealth += report.health.score
    areaMap.set(report.areaId, area)
  }

  const finalizeRegions = (map: Map<string, RegionRollup>): RegionRollup[] =>
    Array.from(map.values())
      .map(region => ({ ...region, avgHealth: Math.round(region.avgHealth / Math.max(region.chapters, 1)) }))
      .sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name))

  return {
    generatedAt,
    period,
    scope,
    totals: {
      chapters: reports.length,
      activeChapters,
      visitors: totalVisitors,
      confirmed: totalConfirmed,
      attended: totalAttended,
      airtimeQualified: totalQualified,
      members: totalMembers,
      funnel,
      avgConversion: totalVisitors ? Math.round((totalMembers / totalVisitors) * 100) : 0,
      avgAttendance: totalCommitted ? Math.round((totalAttended / totalCommitted) * 100) : 0,
      avgHealthScore,
    },
    chapters: reports.sort((a, b) => b.health.score - a.health.score || b.stats.totalVisitors - a.stats.totalVisitors),
    rankings: {
      visitors: rankBy(reports, c => c.stats.totalVisitors),
      confirmed: rankBy(reports, c => c.stats.confirmed),
      attended: rankBy(reports, c => c.stats.attended),
      airtimeQualified: rankBy(reports, c => c.stats.airtimeQualified),
      memberConversion: rankBy(reports, c =>
        c.stats.totalVisitors ? Math.round((c.stats.members / c.stats.totalVisitors) * 100) : 0
      ),
      dataQuality: rankBy(reports, c => c.stats.dataQualityPct),
    },
    regions: {
      cities: finalizeRegions(cityMap),
      areas: finalizeRegions(areaMap),
    },
    alerts: deriveAlerts(reports, now),
  }
}
