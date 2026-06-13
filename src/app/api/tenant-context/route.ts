import { headers } from 'next/headers'
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

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/^www\./, '')
}

export async function GET() {
  try {
    const headerStore = await headers()
    const forwardedHost = headerStore.get('x-forwarded-host')
    const host = normalizeHost(forwardedHost || headerStore.get('host') || '')

    if (!host) {
      return NextResponse.json({ host: '', matched: false })
    }

    if (!supabaseServer) {
      return NextResponse.json({ host, matched: false })
    }

    const { data, error } = await supabaseServer
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
