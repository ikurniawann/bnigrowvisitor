import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

const supabaseServer = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export async function GET(
  _request: Request,
  context: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { chapterId } = await context.params

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase server env belum lengkap.' }, { status: 500 })
    }

    const { data, error } = await supabaseServer
      .from('chapters')
      .select(`
        id,
        name,
        display_name,
        area:area_id (
          id,
          name,
          city:city_id (
            id,
            name
          )
        )
      `)
      .eq('id', chapterId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Chapter tidak ditemukan.' }, { status: 404 })
    }

    const area: any = Array.isArray(data.area) ? data.area[0] : data.area
    const city: any = area ? (Array.isArray(area.city) ? area.city[0] : area.city) : null

    return NextResponse.json({
      chapter: {
        id: data.id,
        name: data.name,
        display_name: data.display_name,
      },
      area: area ? { id: area.id, name: area.name } : null,
      city: city ? { id: city.id, name: city.name } : null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal memuat chapter context.' },
      { status: 500 }
    )
  }
}
