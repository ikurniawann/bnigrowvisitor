import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { findActiveUserById } from '@/lib/server/userService'
import { assembleNationalOverview } from '@/lib/national/overview'
import { loadTargets } from '@/lib/server/targetsService'
import type { ChapterRow } from '@/lib/national/types'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bnigrow.com'
const ROW_LIMIT = 10000
const DAY_MS = 24 * 60 * 60 * 1000

const PERIOD_DAYS: Record<string, number> = {
  '30d': 30,
  '90d': 90,
  '12m': 365,
}

const PERIOD_LABELS: Record<string, string> = {
  '30d': '30 Hari Terakhir',
  '90d': '90 Hari Terakhir',
  '12m': '12 Bulan Terakhir',
  all: 'Semua Waktu',
}

function resolvePeriod(periodParam: string, now: number) {
  const days = PERIOD_DAYS[periodParam]
  if (!days) return { from: null as string | null, to: null as string | null, label: PERIOD_LABELS.all }
  return {
    from: new Date(now - days * DAY_MS).toISOString(),
    to: new Date(now).toISOString(),
    label: PERIOD_LABELS[periodParam] || PERIOD_LABELS.all,
  }
}

function flattenChapters(rows: any[]): ChapterRow[] {
  return (rows || []).map(row => {
    const area = Array.isArray(row.area) ? row.area[0] : row.area
    const city = area ? (Array.isArray(area.city) ? area.city[0] : area.city) : null
    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name || row.name,
      is_active: row.is_active ?? true,
      area_id: row.area_id || area?.id || '',
      area_name: area?.name || '',
      city_id: city?.id || '',
      city_name: city?.name || '',
    }
  })
}

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })
    }

    const user = await findActiveUserById(session.sub)
    const isNational =
      user?.role === 'admin' ||
      user?.role === 'national_admin' ||
      user?.email?.toLowerCase() === NATIONAL_ADMIN_EMAIL
    if (!user || !isNational) {
      return NextResponse.json({ error: 'Dashboard nasional hanya untuk National Admin.' }, { status: 403 })
    }

    const url = new URL(request.url)
    const scope = {
      cityId: url.searchParams.get('cityId') || null,
      areaId: url.searchParams.get('areaId') || null,
      chapterId: url.searchParams.get('chapterId') || null,
    }
    const now = Date.now()
    const generatedAt = new Date(now).toISOString()
    const period = resolvePeriod(url.searchParams.get('period') || 'all', now)

    const admin = getSupabaseAdmin()

    let visitorQuery = admin
      .from('visitors')
      .select(
        'id, chapter_id, status, attended_choice_number, pic_id, phone, email, business_field, company, referral_name, created_at, updated_at'
      )
      .limit(ROW_LIMIT)
    if (period.from) visitorQuery = visitorQuery.gte('created_at', period.from)

    let memberQuery = admin
      .from('members')
      .select('id, chapter_id, status, created_at')
      .limit(ROW_LIMIT)
    if (period.from) memberQuery = memberQuery.gte('created_at', period.from)

    const targetsPromise = loadTargets()

    const [chaptersRes, visitorsRes, membersRes, meetingsRes, usersRes, activityRes] = await Promise.all([
      admin
        .from('chapters')
        .select('id, name, display_name, is_active, area_id, area:area_id (id, name, city:city_id (id, name))')
        .order('name'),
      visitorQuery,
      memberQuery,
      admin.from('meetings').select('id, chapter_id, meeting_date').limit(ROW_LIMIT),
      admin.from('users').select('id, chapter_id, role, is_active').limit(ROW_LIMIT),
      admin
        .from('activity_logs')
        .select('chapter_id, created_at')
        .order('created_at', { ascending: false })
        .limit(ROW_LIMIT),
    ])

    const firstError =
      chaptersRes.error ||
      visitorsRes.error ||
      membersRes.error ||
      meetingsRes.error ||
      usersRes.error ||
      activityRes.error
    if (firstError) throw firstError

    // Surface silent truncation: hitting ROW_LIMIT means aggregates undercount.
    const truncated = [
      ['visitors', visitorsRes.data?.length],
      ['members', membersRes.data?.length],
      ['meetings', meetingsRes.data?.length],
      ['users', usersRes.data?.length],
      ['activity_logs', activityRes.data?.length],
    ].filter(([, count]) => count === ROW_LIMIT)
    if (truncated.length) {
      console.warn(
        `National overview hit ROW_LIMIT (${ROW_LIMIT}) for: ${truncated.map(([name]) => name).join(', ')}. Aggregates may undercount — add pagination.`
      )
    }

    const targets = await targetsPromise

    const overview = assembleNationalOverview({
      chapters: flattenChapters(chaptersRes.data || []),
      visitors: (visitorsRes.data as any) || [],
      members: (membersRes.data as any) || [],
      meetings: (meetingsRes.data as any) || [],
      users: (usersRes.data as any) || [],
      activities: (activityRes.data as any) || [],
      defaultTarget: targets.default,
      targetsByChapter: targets.overrides,
      scope,
      period,
      now,
      generatedAt,
    })

    return NextResponse.json(overview)
  } catch (error: any) {
    console.error('National overview error:', error)
    return NextResponse.json({ error: 'Gagal memuat ringkasan nasional.' }, { status: 500 })
  }
}
