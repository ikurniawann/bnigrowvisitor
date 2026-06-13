import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { enrichUserScope, findActiveUserById } from '@/lib/server/userService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const user = await findActiveUserById(session.sub)
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user: await enrichUserScope(user) })
  } catch (error: any) {
    console.error('Session check error:', error)
    return NextResponse.json({ error: 'Gagal memuat sesi.' }, { status: 500 })
  }
}
