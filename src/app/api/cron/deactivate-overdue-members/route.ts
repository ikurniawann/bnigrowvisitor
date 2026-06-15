import { NextResponse } from 'next/server'
import { deactivateOverdueMembers } from '@/lib/server/membershipRenewal'

export const dynamic = 'force-dynamic'

// Daily job (Vercel Cron). Deactivates members whose renewal lapsed past the
// grace period. Protected by CRON_SECRET: Vercel sends it as a Bearer token on
// scheduled invocations, and it gates manual calls too.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Fail closed: without a configured secret the endpoint stays locked.
    console.error('CRON_SECRET belum diset; endpoint cron dinonaktifkan.')
    return false
  }
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  return header === `Bearer ${secret}`
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const result = await deactivateOverdueMembers()
  return NextResponse.json({ data: result })
}

// Vercel Cron issues GET; POST is allowed for manual/ops triggering.
export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}
