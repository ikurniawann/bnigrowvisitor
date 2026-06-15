import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { findActiveUserById } from '@/lib/server/userService'
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/server/apiKeysService'
import { isMissingTableError } from '@/lib/server/dbErrors'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bniindonesia.com'

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
    return NextResponse.json({ data: await listApiKeys() })
  } catch (error: any) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ data: [], pendingMigration: true })
    }
    console.error('List API keys error:', error)
    return NextResponse.json({ error: 'Gagal memuat API key.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Nama API key wajib diisi.' }, { status: 400 })

  const expiresAt =
    typeof body?.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null

  try {
    const created = await createApiKey({
      name,
      scope: 'finance',
      organizationId: guard.user.organization_id ?? null,
      createdBy: guard.user.id,
      expiresAt,
    })
    // rawKey is returned once here and never again.
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error: any) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'Tabel api_keys belum dibuat. Jalankan migration 014.' },
        { status: 503 }
      )
    }
    console.error('Create API key error:', error)
    return NextResponse.json({ error: 'Gagal membuat API key.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const guard = await requireNationalAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi.' }, { status: 400 })

  try {
    await revokeApiKey(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Revoke API key error:', error)
    return NextResponse.json({ error: 'Gagal menonaktifkan API key.' }, { status: 500 })
  }
}
