import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { findActiveUserById, hashPassword } from '@/lib/server/userService'

export const dynamic = 'force-dynamic'

const NATIONAL_ADMIN_EMAIL = 'admin@bniindonesia.com'
const MIN_PASSWORD_LENGTH = 6
const ADMIN_SELECT = 'id, name, email, phone, is_active, chapter_id'

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function requireChapterAdminOrNational(requestedChapterId: string) {
  const session = await getSession()
  if (!session) throw new ApiError('Silakan login ulang.', 401)

  const user = await findActiveUserById(session.sub)
  if (!user) throw new ApiError('Sesi tidak valid.', 401)

  const isNational =
    user.role === 'admin' ||
    user.role === 'national_admin' ||
    user.email?.toLowerCase() === NATIONAL_ADMIN_EMAIL

  if (isNational) return user

  if (user.role === 'chapter_admin') {
    if (user.chapter_id !== requestedChapterId) {
      throw new ApiError('Anda hanya dapat mengelola PIC di chapter Anda sendiri.', 403)
    }
    return user
  }

  throw new ApiError('Hanya Chapter Admin atau National Admin yang bisa mengelola akun PIC.', 403)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapterId')?.trim()
    if (!chapterId) return NextResponse.json({ error: 'chapterId wajib diisi.' }, { status: 400 })

    await requireChapterAdminOrNational(chapterId)

    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .select(ADMIN_SELECT)
      .eq('chapter_id', chapterId)
      .eq('role', 'pic')
      .order('name')

    if (error) throw error
    return NextResponse.json({ pics: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const action = body?.action as string

    const admin = getSupabaseAdmin()

    if (action === 'create') {
      const { chapterId: cId, name, email, phone, password } = body
      if (!cId || !name?.trim() || !email?.trim()) {
        return NextResponse.json({ error: 'Chapter, nama, dan email wajib diisi.' }, { status: 400 })
      }
      if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json({ error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` }, { status: 400 })
      }

      await requireChapterAdminOrNational(cId)

      const normalizedEmail = email.trim().toLowerCase()
      const { data: existing } = await admin
        .from('users')
        .select('id, role')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: `Email ${normalizedEmail} sudah dipakai akun lain.` }, { status: 409 })
      }

      const hash = await hashPassword(password)
      const { data, error } = await admin
        .from('users')
        .insert({
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          role: 'pic',
          chapter_id: cId,
          password_hash: hash,
          is_active: true,
        })
        .select(ADMIN_SELECT)
        .single()

      if (error) throw error
      return NextResponse.json({ pic: data })
    }

    if (action === 'update') {
      const { id, name, phone } = body
      if (!id || !name?.trim()) {
        return NextResponse.json({ error: 'id dan nama wajib diisi.' }, { status: 400 })
      }

      // Fetch target user to verify chapter scope
      const { data: target } = await admin
        .from('users')
        .select('chapter_id')
        .eq('id', id)
        .eq('role', 'pic')
        .maybeSingle()

      if (!target) return NextResponse.json({ error: 'Akun PIC tidak ditemukan.' }, { status: 404 })
      await requireChapterAdminOrNational(target.chapter_id)

      const { data, error } = await admin
        .from('users')
        .update({ name: name.trim(), phone: phone?.trim() || null })
        .eq('id', id)
        .eq('role', 'pic')
        .select(ADMIN_SELECT)
        .single()

      if (error) throw error
      return NextResponse.json({ pic: data })
    }

    if (action === 'set-password') {
      const { id, password } = body
      if (!id || !password || password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json({ error: `id dan password minimal ${MIN_PASSWORD_LENGTH} karakter wajib diisi.` }, { status: 400 })
      }

      const { data: target } = await admin
        .from('users')
        .select('chapter_id')
        .eq('id', id)
        .eq('role', 'pic')
        .maybeSingle()

      if (!target) return NextResponse.json({ error: 'Akun PIC tidak ditemukan.' }, { status: 404 })
      await requireChapterAdminOrNational(target.chapter_id)

      const hash = await hashPassword(password)
      const { error } = await admin
        .from('users')
        .update({ password_hash: hash })
        .eq('id', id)
        .eq('role', 'pic')

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle') {
      const { id, isActive } = body
      if (!id) return NextResponse.json({ error: 'id wajib diisi.' }, { status: 400 })

      const { data: target } = await admin
        .from('users')
        .select('chapter_id')
        .eq('id', id)
        .eq('role', 'pic')
        .maybeSingle()

      if (!target) return NextResponse.json({ error: 'Akun PIC tidak ditemukan.' }, { status: 404 })
      await requireChapterAdminOrNational(target.chapter_id)

      const { error } = await admin
        .from('users')
        .update({ is_active: !isActive })
        .eq('id', id)
        .eq('role', 'pic')

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 })
  }
}
