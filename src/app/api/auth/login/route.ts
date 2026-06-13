import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from '@/lib/server/session'
import {
  enrichUserScope,
  findActiveUserByEmail,
  verifyAndUpgradePassword,
} from '@/lib/server/userService'
import { recordLoginAttempt, clientIpFromHeaders } from '@/lib/server/loginAudit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request)
  const userAgent = request.headers.get('user-agent')
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
    }

    const user = await findActiveUserByEmail(email, true)

    if (!user || !(await verifyAndUpgradePassword(user, password))) {
      await recordLoginAttempt({
        email,
        success: false,
        reason: user ? 'wrong_password' : 'user_not_found',
        ip,
        userAgent,
        userId: user?.id ?? null,
        chapterId: user?.chapter_id ?? null,
        organizationId: user?.organization_id ?? null,
      })
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 })
    }

    await recordLoginAttempt({
      email,
      success: true,
      ip,
      userAgent,
      userId: user.id,
      chapterId: user.chapter_id ?? null,
      organizationId: user.organization_id ?? null,
    })

    const safeUser = await enrichUserScope(user)
    const token = createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      chapter_id: user.chapter_id ?? null,
      organization_id: user.organization_id ?? null,
    })

    const response = NextResponse.json({ success: true, user: safeUser })
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login gagal. Coba lagi.' }, { status: 500 })
  }
}
