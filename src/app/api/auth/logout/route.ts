import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/server/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 })
  return response
}
