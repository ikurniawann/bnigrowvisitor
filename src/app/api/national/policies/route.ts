import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { findActiveUserById } from '@/lib/server/userService'
import { listPolicies, upsertPolicy, deletePolicyOverride } from '@/lib/server/policyService'
import { isPolicyType, defaultPolicyConfig, POLICY_TYPES } from '@/lib/national/policies'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bnigrow.com'

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

export async function GET() {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const { rows, pendingMigration } = await listPolicies()
    const defaults = Object.fromEntries(POLICY_TYPES.map(type => [type, defaultPolicyConfig(type)]))
    return NextResponse.json({ policies: rows, defaults, pendingMigration })
  } catch (error: any) {
    console.error('List policies error:', error)
    return NextResponse.json({ error: 'Gagal memuat policy.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const body = await request.json().catch(() => null)
    const policyType = body?.policyType
    if (!isPolicyType(policyType)) {
      return NextResponse.json({ error: 'policyType tidak valid.' }, { status: 400 })
    }
    if (!body?.config || typeof body.config !== 'object') {
      return NextResponse.json({ error: 'config wajib berupa object.' }, { status: 400 })
    }
    const chapterId = typeof body?.chapterId === 'string' && body.chapterId ? body.chapterId : null

    await upsertPolicy(policyType, chapterId, body.config, guard.user.organization_id ?? null)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === '42P01') {
      return NextResponse.json({ error: 'Tabel policy belum dibuat. Jalankan migration 012.' }, { status: 503 })
    }
    console.error('Upsert policy error:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan policy.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const url = new URL(request.url)
    const policyType = url.searchParams.get('policyType')
    const chapterId = url.searchParams.get('chapterId')
    if (!isPolicyType(policyType) || !chapterId) {
      return NextResponse.json({ error: 'policyType dan chapterId wajib diisi.' }, { status: 400 })
    }
    await deletePolicyOverride(policyType, chapterId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete policy error:', error)
    return NextResponse.json({ error: 'Gagal menghapus policy.' }, { status: 500 })
  }
}
