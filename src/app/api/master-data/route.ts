import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { findActiveUserById, hashPassword } from '@/lib/server/userService'
import { ensureChapterDomain } from '@/lib/server/chapterDomain'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bniindonesia.com'

// Columns each table accepts from the client. Anything else is dropped so the
// service-role client can never be used for mass assignment.
const ALLOWED_COLUMNS: Record<string, Set<string>> = {
  cities: new Set(['organization_id', 'name', 'is_active']),
  areas: new Set(['city_id', 'name', 'is_active']),
  chapters: new Set(['area_id', 'name', 'display_name', 'is_active']),
  chapter_domains: new Set(['chapter_id', 'domain', 'type', 'is_primary', 'is_active']),
  users: new Set(['name', 'email', 'phone', 'chapter_id', 'organization_id', 'is_active']),
}

const REQUIRED_INSERT_COLUMNS: Record<string, string[]> = {
  cities: ['organization_id', 'name'],
  areas: ['city_id', 'name'],
  chapters: ['area_id', 'name', 'display_name'],
  chapter_domains: ['chapter_id', 'domain'],
  users: ['name', 'email', 'chapter_id'],
}

const MIN_PASSWORD_LENGTH = 6

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function requireNationalAdmin() {
  const session = await getSession()
  if (!session) {
    throw new ApiError('Silakan login ulang.', 401)
  }

  const user = await findActiveUserById(session.sub)
  if (!user) {
    throw new ApiError('Sesi user tidak valid.', 401)
  }

  const isNational =
    user.role === 'admin' ||
    user.role === 'national_admin' ||
    user.email?.toLowerCase() === NATIONAL_ADMIN_EMAIL

  if (!isNational) {
    throw new ApiError('Akses master data hanya untuk National Admin.', 403)
  }

  return user
}

function sanitizePayload(table: string, payload: Record<string, unknown>) {
  const allowed = ALLOWED_COLUMNS[table]
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload || {})) {
    if (allowed.has(key)) {
      sanitized[key] = typeof value === 'string' ? value.trim() : value
    }
  }

  if (typeof sanitized.email === 'string') {
    sanitized.email = sanitized.email.toLowerCase()
  }
  if (typeof sanitized.domain === 'string') {
    sanitized.domain = sanitized.domain.toLowerCase()
  }

  return sanitized
}

function assertRequiredColumns(table: string, payload: Record<string, unknown>) {
  for (const column of REQUIRED_INSERT_COLUMNS[table]) {
    const value = payload[column]
    if (value === undefined || value === null || value === '') {
      throw new ApiError(`Kolom ${column} wajib diisi.`, 400)
    }
  }
}

function handleError(error: any) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('Master data error:', error)
  return NextResponse.json({ error: error.message || 'Gagal memproses master data.' }, { status: 500 })
}

export async function GET() {
  try {
    await requireNationalAdmin()
    const admin = getSupabaseAdmin()

    const [orgResult, cityResult, areaResult, chapterResult, domainResult, adminResult] = await Promise.all([
      admin.from('organizations').select('id, name').order('name'),
      admin.from('cities').select('id, organization_id, name, is_active, organization:organization_id(id, name)').order('name'),
      admin.from('areas').select('id, city_id, name, is_active, city:city_id(id, organization_id, name, is_active)').order('name'),
      admin.from('chapters').select('id, area_id, name, display_name, is_active, area:area_id(id, city_id, name, is_active)').order('name'),
      admin.from('chapter_domains').select('id, chapter_id, domain, type, is_primary, is_active, chapter:chapter_id(id, area_id, name, display_name, is_active)').order('domain'),
      admin
        .from('users')
        .select('id, name, email, phone, chapter_id, is_active, chapter:chapter_id(id, area_id, name, display_name, is_active)')
        .eq('role', 'chapter_admin')
        .order('name'),
    ])

    for (const result of [orgResult, cityResult, areaResult, chapterResult, domainResult, adminResult]) {
      if (result.error) throw result.error
    }

    return NextResponse.json({
      organizations: orgResult.data || [],
      cities: cityResult.data || [],
      areas: areaResult.data || [],
      chapters: chapterResult.data || [],
      domains: domainResult.data || [],
      admins: adminResult.data || [],
    })
  } catch (error: any) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireNationalAdmin()
    const admin = getSupabaseAdmin()

    const body = await request.json().catch(() => null)
    const action = body?.action as string
    const table = body?.table as string
    const id = typeof body?.id === 'string' ? body.id : undefined

    if (!ALLOWED_COLUMNS[table]) {
      throw new ApiError('Table tidak diizinkan.', 400)
    }

    if (action === 'toggle') {
      if (!id) throw new ApiError('ID wajib diisi.', 400)

      if (table === 'users') {
        const { data: target, error: targetError } = await admin
          .from('users')
          .select('id, role')
          .eq('id', id)
          .maybeSingle()

        if (targetError) throw targetError
        if (!target || target.role !== 'chapter_admin') {
          throw new ApiError('Hanya akun chapter admin yang bisa dikelola dari sini.', 400)
        }
      }

      const { error } = await admin
        .from(table)
        .update({ is_active: Boolean(body?.payload?.is_active), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'upsert') {
      const payload = sanitizePayload(table, body?.payload || {})

      if (table === 'users') {
        // This endpoint only manages chapter admin accounts; the role is
        // forced server-side and passwords are always stored as bcrypt.
        payload.role = 'chapter_admin'

        const password = typeof body?.payload?.password === 'string' ? body.payload.password.trim() : ''
        if (password) {
          if (password.length < MIN_PASSWORD_LENGTH) {
            throw new ApiError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`, 400)
          }
          payload.password_hash = await hashPassword(password)
        } else if (!id) {
          throw new ApiError('Password wajib diisi untuk admin baru.', 400)
        }
      }

      if (id) {
        if (table === 'users') {
          const { data: target, error: targetError } = await admin
            .from('users')
            .select('id, role')
            .eq('id', id)
            .maybeSingle()

          if (targetError) throw targetError
          if (!target || target.role !== 'chapter_admin') {
            throw new ApiError('Hanya akun chapter admin yang bisa dikelola dari sini.', 400)
          }
        }

        const { error } = await admin
          .from(table)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
      }

      assertRequiredColumns(table, payload)

      // Creating a chapter auto-provisions its primary subdomain (<slug>.<base>)
      // when APP_BASE_DOMAIN is configured. Dormant no-op otherwise.
      if (table === 'chapters') {
        const { data: inserted, error } = await admin
          .from('chapters')
          .insert(payload)
          .select('id, name, display_name')
          .single()
        if (error) throw error

        let domain: string | null = null
        try {
          domain = await ensureChapterDomain(
            admin,
            inserted.id,
            (inserted.name as string) || (inserted.display_name as string) || ''
          )
        } catch (domainError) {
          // Chapter exists; only the auto-domain failed. Don't roll back.
          console.error('Auto-domain gagal dibuat:', domainError)
        }
        return NextResponse.json({ success: true, id: inserted.id, domain })
      }

      const { error } = await admin.from(table).insert(payload)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    throw new ApiError('Action tidak dikenal.', 400)
  } catch (error: any) {
    return handleError(error)
  }
}
