import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { findActiveUserById } from '@/lib/server/userService'
import { isMissingTableError } from '@/lib/server/dbErrors'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bnigrow.com'
const PAGE_LIMIT = 200

// National-only audit feed: login attempts + data-change activity, optionally
// scoped to one chapter.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })

    const user = await findActiveUserById(session.sub)
    const isNational =
      user?.role === 'admin' ||
      user?.role === 'national_admin' ||
      user?.email?.toLowerCase() === NATIONAL_ADMIN_EMAIL
    if (!user || !isNational) {
      return NextResponse.json({ error: 'Hanya untuk National Admin.' }, { status: 403 })
    }

    const url = new URL(request.url)
    const chapterId = url.searchParams.get('chapterId')
    const admin = getSupabaseAdmin()

    let loginQuery = admin
      .from('login_audit')
      .select('id, email, success, reason, ip, user_agent, chapter_id, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT)
    if (chapterId) loginQuery = loginQuery.eq('chapter_id', chapterId)

    let activityQuery = admin
      .from('activity_logs')
      .select('id, actor_name, actor_email, actor_role, action, entity, entity_label, chapter_id, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT)
    if (chapterId) activityQuery = activityQuery.eq('chapter_id', chapterId)

    const [loginRes, activityRes] = await Promise.all([loginQuery, activityQuery])

    // login_audit may not exist before migration 012; degrade gracefully.
    const loginMissing = isMissingTableError(loginRes.error)
    const logins = loginRes.error ? [] : loginRes.data || []
    if (loginRes.error && !loginMissing) {
      console.error('Login audit query error:', loginRes.error.message)
    }
    if (activityRes.error) throw activityRes.error

    return NextResponse.json({
      logins,
      activity: activityRes.data || [],
      pendingMigration: loginMissing,
    })
  } catch (error: any) {
    console.error('National audit error:', error)
    return NextResponse.json({ error: 'Gagal memuat audit.' }, { status: 500 })
  }
}
