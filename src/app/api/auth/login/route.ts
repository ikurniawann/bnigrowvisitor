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

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
    }

    const user = await findActiveUserByEmail(email, true)

    if (!user || !(await verifyAndUpgradePassword(user, password))) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 })
    }

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
