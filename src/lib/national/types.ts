import type { AlertSeverity } from './config'

// Raw rows the analytics layer consumes. Kept minimal and framework-agnostic so
// the pure functions can be unit-tested without Supabase.

export interface ChapterRow {
  id: string
  name: string
  display_name: string
  is_active: boolean
  area_id: string
  area_name: string
  city_id: string
  city_name: string
}

export interface VisitorRow {
  id: string
  chapter_id?: string | null
  status: string
  attended_choice_number?: number | null
  pic_id?: string | null
  phone?: string | null
  email?: string | null
  business_field?: string | null
  company?: string | null
  referral_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface MemberRow {
  id: string
  chapter_id?: string | null
  status?: string | null
  created_at?: string | null
}

export interface MeetingRow {
  id: string
  chapter_id?: string | null
  meeting_date?: string | null
}

export interface ChapterUserRow {
  id: string
  chapter_id?: string | null
  role: string
  is_active: boolean
}

export interface ActivityRow {
  chapter_id?: string | null
  created_at?: string | null
}

// Computed shapes returned by the API.

export interface ChapterStats {
  totalVisitors: number
  confirmed: number
  attended: number
  airtimeQualified: number
  members: number
  unassigned: number
  withPic: number
  dataQualityPct: number
  meetingsLast30: number
  lastMeetingDate: string | null
  lastActivityAt: string | null
  picCount: number
  hasAdmin: boolean
  unfollowedQualified: number
}

export interface HealthComponents {
  attendance: number
  conversion: number
  dataQuality: number
  picCoverage: number
  meeting: number
}

export interface ChapterHealth {
  score: number
  grade: string
  label: string
  tone: string
  components: HealthComponents
}

export interface ChapterReport {
  id: string
  name: string
  displayName: string
  areaId: string
  areaName: string
  cityId: string
  cityName: string
  isActive: boolean
  stats: ChapterStats
  health: ChapterHealth
}

export interface FunnelStep {
  key: string
  label: string
  count: number
}

export interface RankingEntry {
  chapterId: string
  displayName: string
  value: number
}

export interface RegionRollup {
  id: string
  name: string
  cityId?: string
  chapters: number
  visitors: number
  members: number
  avgHealth: number
}

export interface NationalAlert {
  id: string
  severity: AlertSeverity
  type: string
  chapterId: string
  chapterName: string
  message: string
  count?: number
}

export interface NationalOverview {
  generatedAt: string
  period: { from: string | null; to: string | null; label: string }
  scope: { cityId: string | null; areaId: string | null; chapterId: string | null }
  totals: {
    chapters: number
    activeChapters: number
    visitors: number
    confirmed: number
    attended: number
    airtimeQualified: number
    members: number
    funnel: FunnelStep[]
    avgConversion: number
    avgAttendance: number
    avgHealthScore: number
  }
  chapters: ChapterReport[]
  rankings: {
    visitors: RankingEntry[]
    confirmed: RankingEntry[]
    attended: RankingEntry[]
    airtimeQualified: RankingEntry[]
    memberConversion: RankingEntry[]
    dataQuality: RankingEntry[]
  }
  regions: {
    cities: RegionRollup[]
    areas: RegionRollup[]
  }
  alerts: NationalAlert[]
}
