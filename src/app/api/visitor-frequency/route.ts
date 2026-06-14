import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { DEFAULT_VISITOR_FREQUENCY } from '@/lib/national/policies'

export const dynamic = 'force-dynamic'

// Statuses that count as "a completed visit" for frequency enforcement.
const COUNTED_STATUSES = ['attended', 'interview', 'member', 'not_continue']

function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/[^0-9]/g, '')
  const core = digits.startsWith('62')
    ? digits.slice(2)
    : digits.startsWith('0')
    ? digits.slice(1)
    : digits
  return [`0${core}`, `62${core}`]
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rawPhone = searchParams.get('phone')?.trim()
  if (!rawPhone) return NextResponse.json({ error: 'phone wajib diisi.' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Load national default for visitor_frequency (ignore per-chapter overrides — rule is global).
  const { data: policyRow } = await admin
    .from('national_policies')
    .select('config')
    .eq('policy_type', 'visitor_frequency')
    .is('chapter_id', null)
    .maybeSingle()

  const cfg = (policyRow?.config ?? {}) as Record<string, unknown>
  const maxVisits = Number(cfg.max_visits ?? DEFAULT_VISITOR_FREQUENCY.max_visits)
  const periodMonths = Number(cfg.period_months ?? DEFAULT_VISITOR_FREQUENCY.period_months)

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - periodMonths)

  const variants = phoneVariants(rawPhone)
  const orFilter = variants.map(v => `phone.eq.${v}`).join(',')

  const { data, error } = await admin
    .from('visitors')
    .select('id, name, chapter, status, created_at, meeting:meeting_id(title, meeting_date)')
    .in('status', COUNTED_STATUSES)
    .gte('created_at', cutoff.toISOString())
    .or(orFilter)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('visitor-frequency query error:', error)
    return NextResponse.json({ error: 'Gagal cek riwayat.' }, { status: 500 })
  }

  const visits = data || []
  return NextResponse.json({
    count: visits.length,
    limit: maxVisits,
    periodMonths,
    exceeded: visits.length >= maxVisits,
    visits,
  })
}
