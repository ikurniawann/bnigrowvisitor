import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { resolvePoliciesForChapter } from '@/lib/server/policyService'
import { isMissingTableError } from '@/lib/server/dbErrors'

export const dynamic = 'force-dynamic'

// Effective policies (national default merged with chapter override) for the
// authenticated user's chapter, or a requested chapter for national admins.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })

    const url = new URL(request.url)
    const requested = url.searchParams.get('chapterId')
    const isNational = session.role === 'national_admin' || session.role === 'admin'

    // Non-national users are pinned to their own chapter.
    const chapterId = isNational && requested ? requested : session.chapter_id || requested || ''
    if (!chapterId) return NextResponse.json({ policies: {} })

    const policies = await resolvePoliciesForChapter(chapterId)
    return NextResponse.json({ chapterId, policies })
  } catch (error: any) {
    if (isMissingTableError(error)) return NextResponse.json({ policies: {}, pendingMigration: true })
    console.error('Chapter policies error:', error)
    return NextResponse.json({ error: 'Gagal memuat policy chapter.' }, { status: 500 })
  }
}
