import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Chapter metadata (names + area/city) for authenticated users, e.g. the
// national dashboard breakdown. Master tables are RLS-locked for the anon key,
// so the client must come through this route.
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('chapters')
      .select(`
        id,
        name,
        display_name,
        is_active,
        area_id,
        area:area_id (
          id,
          name,
          city:city_id (
            id,
            name
          )
        )
      `)
      .order('name')

    if (error) throw error

    const chapters = (data || []).map((chapter: any) => {
      const area = Array.isArray(chapter.area) ? chapter.area[0] : chapter.area
      const city = area ? (Array.isArray(area.city) ? area.city[0] : area.city) : null

      return {
        id: chapter.id,
        name: chapter.name,
        display_name: chapter.display_name,
        is_active: chapter.is_active,
        area_id: chapter.area_id,
        area_name: area?.name || '',
        city_id: city?.id || '',
        city_name: city?.name || '',
      }
    })

    return NextResponse.json({ chapters })
  } catch (error: any) {
    console.error('Chapters list error:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar chapter.' }, { status: 500 })
  }
}
