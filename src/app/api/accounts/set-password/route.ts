import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { findActiveUserById, updatePassword } from '@/lib/server/userService'

export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LENGTH = 6
const MANAGER_ROLES = new Set(['admin', 'national_admin', 'chapter_admin', 'pic'])
const MANAGEABLE_TARGET_ROLES = new Set(['pic', 'member'])

// Sets/resets the password of a PIC or member account. Admin passwords can
// never be changed here; non-national callers can only touch their own chapter.
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })
    }

    const caller = await findActiveUserById(session.sub)
    if (!caller || !MANAGER_ROLES.has(caller.role)) {
      return NextResponse.json({ error: 'Tidak punya akses mengelola akun.' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const targetUserId = typeof body?.userId === 'string' ? body.userId : ''
    const targetEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!targetUserId && !targetEmail) {
      return NextResponse.json({ error: 'userId atau email target wajib diisi.' }, { status: 400 })
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()
    let query = admin.from('users').select('id, role, chapter_id, email')
    query = targetUserId ? query.eq('id', targetUserId) : query.eq('email', targetEmail)

    const { data: target, error } = await query.maybeSingle()
    if (error) throw error

    if (!target || !MANAGEABLE_TARGET_ROLES.has(target.role)) {
      return NextResponse.json(
        { error: 'Akun target tidak ditemukan atau bukan akun PIC/member.' },
        { status: 404 }
      )
    }

    const callerIsNational =
      caller.role === 'admin' ||
      caller.role === 'national_admin' ||
      caller.email?.toLowerCase() === 'admin@bniindonesia.com'

    if (!callerIsNational && target.chapter_id && caller.chapter_id !== target.chapter_id) {
      return NextResponse.json(
        { error: 'Akun target berada di chapter lain.' },
        { status: 403 }
      )
    }

    await updatePassword(target.id, password)

    return NextResponse.json({ success: true, userId: target.id })
  } catch (error: any) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan password.' }, { status: 500 })
  }
}
