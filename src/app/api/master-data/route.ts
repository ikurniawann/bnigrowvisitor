import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseServer = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const allowedTables = new Set(['cities', 'areas', 'chapters', 'chapter_domains', 'users'])

async function assertNationalAdmin(userId: string) {
  if (!supabaseServer) throw new Error('Supabase server env belum lengkap.')
  if (!userId) throw new Error('Sesi user tidak ditemukan.')

  const { data: user, error } = await supabaseServer
    .from('users')
    .select('id, email, role, is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .single()

  if (error || !user) throw new Error('Sesi user tidak valid.')

  const isNational = user.role === 'admin' || user.role === 'national_admin' || user.email === 'admin@bnigrow.com'
  if (!isNational) throw new Error('Akses master data hanya untuk National Admin.')

  return user
}

export async function GET(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase server env belum lengkap.' }, { status: 500 })
    }

    const url = new URL(request.url)
    await assertNationalAdmin(url.searchParams.get('userId') || '')

    const [orgResult, cityResult, areaResult, chapterResult, domainResult, adminResult] = await Promise.all([
      supabaseServer.from('organizations').select('id, name').order('name'),
      supabaseServer.from('cities').select('id, organization_id, name, is_active, organization:organization_id(id, name)').order('name'),
      supabaseServer.from('areas').select('id, city_id, name, is_active, city:city_id(id, organization_id, name, is_active)').order('name'),
      supabaseServer.from('chapters').select('id, area_id, name, display_name, is_active, area:area_id(id, city_id, name, is_active)').order('name'),
      supabaseServer.from('chapter_domains').select('id, chapter_id, domain, type, is_primary, is_active, chapter:chapter_id(id, area_id, name, display_name, is_active)').order('domain'),
      supabaseServer
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
    return NextResponse.json(
      { error: error.message || 'Gagal memuat master data.' },
      { status: error.message?.includes('Akses') || error.message?.includes('Sesi') ? 403 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase server env belum lengkap.' }, { status: 500 })
    }

    const body = await request.json()
    await assertNationalAdmin(body.userId || '')

    const action = body.action as string
    const table = body.table as string
    const id = body.id as string | undefined
    const payload = body.payload || {}

    if (!allowedTables.has(table)) {
      return NextResponse.json({ error: 'Table tidak diizinkan.' }, { status: 400 })
    }

    if (action === 'toggle') {
      if (!id) return NextResponse.json({ error: 'ID wajib diisi.' }, { status: 400 })
      const { error } = await supabaseServer
        .from(table)
        .update({ is_active: Boolean(payload.is_active), updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'upsert') {
      if (id) {
        const { error } = await supabaseServer
          .from(table)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      const { error } = await supabaseServer
        .from(table)
        .insert(payload)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan master data.' },
      { status: error.message?.includes('Akses') || error.message?.includes('Sesi') ? 403 : 500 }
    )
  }
}
