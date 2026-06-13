import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { findActiveUserById } from '@/lib/server/userService'
import { listTargets, upsertTarget, deleteTargetOverride } from '@/lib/server/targetsService'
import { isMissingTableError } from '@/lib/server/dbErrors'
import { DEFAULT_TARGETS } from '@/lib/national/config'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bnigrow.com'

const NUMERIC_FIELDS = [
  'visitors_per_meeting',
  'member_conversion_pct',
  'min_active_pic',
  'min_weekly_meetings_per_month',
] as const

type Guard =
  | { ok: false; error: string; status: 401 | 403 }
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof findActiveUserById>>> }

async function requireNationalAdmin(): Promise<Guard> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Silakan login ulang.', status: 401 }
  const user = await findActiveUserById(session.sub)
  const isNational =
    user?.role === 'admin' ||
    user?.role === 'national_admin' ||
    user?.email?.toLowerCase() === NATIONAL_ADMIN_EMAIL
  if (!user || !isNational) return { ok: false, error: 'Hanya untuk National Admin.', status: 403 }
  return { ok: true, user }
}

function parseTargets(body: any) {
  const values: Record<string, number> = {}
  for (const field of NUMERIC_FIELDS) {
    const raw = Number(body?.[field])
    if (!Number.isFinite(raw) || raw < 0 || raw > 100000) {
      throw new Error(`Nilai ${field} tidak valid.`)
    }
    values[field] = Math.round(raw)
  }
  return values as Record<(typeof NUMERIC_FIELDS)[number], number>
}

export async function GET() {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const rows = await listTargets()
    return NextResponse.json({ defaults: DEFAULT_TARGETS, targets: rows })
  } catch (error: any) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ defaults: DEFAULT_TARGETS, targets: [], pendingMigration: true })
    }
    console.error('List targets error:', error)
    return NextResponse.json({ error: 'Gagal memuat target.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const body = await request.json().catch(() => null)
    const chapterId = typeof body?.chapterId === 'string' && body.chapterId ? body.chapterId : null
    const values = parseTargets(body)

    await upsertTarget({
      chapterId,
      organizationId: guard.user.organization_id ?? null,
      ...values,
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'Tabel target belum dibuat. Jalankan migration 012.' }, { status: 503 })
    }
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan target.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const url = new URL(request.url)
    const chapterId = url.searchParams.get('chapterId')
    if (!chapterId) return NextResponse.json({ error: 'chapterId wajib diisi.' }, { status: 400 })

    await deleteTargetOverride(chapterId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete target error:', error)
    return NextResponse.json({ error: 'Gagal menghapus target.' }, { status: 500 })
  }
}
