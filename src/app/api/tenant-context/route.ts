import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'

export const dynamic = 'force-dynamic'

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/^www\./, '')
}

// Public on purpose: the login page needs host-based chapter branding before
// any session exists. It only exposes chapter/area/city display names.
export async function GET() {
  try {
    const headerStore = await headers()
    const forwardedHost = headerStore.get('x-forwarded-host')
    const host = normalizeHost(forwardedHost || headerStore.get('host') || '')

    if (!host) {
      return NextResponse.json({ host: '', matched: false })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('chapter_domains')
      .select(`
        id,
        domain,
        type,
        is_primary,
        chapter:chapter_id (
          id,
          name,
          display_name,
          area:area_id (
            id,
            name,
            city:city_id (
              id,
              name,
              organization:organization_id (
                id,
                name
              )
            )
          )
        )
      `)
      .eq('domain', host)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!data?.chapter) {
      return NextResponse.json({ host, matched: false })
    }

    const chapter: any = Array.isArray(data.chapter) ? data.chapter[0] : data.chapter
    const area = Array.isArray(chapter.area) ? chapter.area[0] : chapter.area
    const city = area ? (Array.isArray(area.city) ? area.city[0] : area.city) : null
    const organization = city?.organization
      ? (Array.isArray(city.organization) ? city.organization[0] : city.organization)
      : null

    return NextResponse.json({
      host,
      matched: true,
      domain: {
        id: data.id,
        domain: data.domain,
        type: data.type,
        is_primary: data.is_primary,
      },
      organization,
      city: city ? { id: city.id, name: city.name } : null,
      area: area ? { id: area.id, name: area.name } : null,
      chapter: {
        id: chapter.id,
        name: chapter.name,
        display_name: chapter.display_name,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Gagal membaca tenant context.' },
      { status: 500 }
    )
  }
}
