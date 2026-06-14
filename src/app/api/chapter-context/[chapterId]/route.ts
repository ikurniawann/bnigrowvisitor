import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ chapterId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })
    }

    const { chapterId } = await context.params

    const isNational = session.role === 'national_admin' || session.role === 'admin'
    if (!isNational && session.chapter_id !== chapterId) {
      return NextResponse.json({ error: 'Tidak diizinkan mengakses chapter ini.' }, { status: 403 })
    }

    const { data, error } = await getSupabaseAdmin()
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
