import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'

// The shape exposed to external consumers (BNI Finance). Deliberately a curated
// subset of the members row — internal notes and login-account linkage are not
// exposed. Stable field names form the external API contract.
export interface ExternalMemberDTO {
  id: string
  chapter_id: string | null
  chapter: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  business_field: string | null
  status: string
  joined_date: string | null
  renewal_date: string | null
  last_renewed_at: string | null
  updated_at: string | null
}

interface MemberRow {
  id: string
  chapter_id: string | null
  chapter: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  business_field: string | null
  status: string
  joined_date: string | null
  renewal_date: string | null
  last_renewed_at: string | null
  updated_at: string | null
}

const SELECT_COLUMNS =
  'id, chapter_id, chapter, name, email, phone, company, business_field, status, joined_date, renewal_date, last_renewed_at, updated_at'

function toDTO(row: MemberRow): ExternalMemberDTO {
  return {
    id: row.id,
    chapter_id: row.chapter_id,
    chapter: row.chapter,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    business_field: row.business_field,
    status: row.status,
    joined_date: row.joined_date,
    renewal_date: row.renewal_date,
    last_renewed_at: row.last_renewed_at,
    updated_at: row.updated_at,
  }
}

export interface ListMembersExternalParams {
  chapterId?: string | null
  status?: string | null
  // Returns members whose renewal_date is on or before this date — the natural
  // filter for an invoice run ("who is due by month-end?").
  renewalBefore?: string | null
  limit: number
  offset: number
}

export interface ListMembersExternalResult {
  members: ExternalMemberDTO[]
  total: number
  limit: number
  offset: number
}

export async function listMembersExternal(
  params: ListMembersExternalParams
): Promise<ListMembersExternalResult> {
  let query = getSupabaseAdmin()
    .from('members')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .order('renewal_date', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (params.chapterId) query = query.eq('chapter_id', params.chapterId)
  if (params.status) query = query.eq('status', params.status)
  if (params.renewalBefore) query = query.lte('renewal_date', params.renewalBefore)

  query = query.range(params.offset, params.offset + params.limit - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    members: ((data || []) as MemberRow[]).map(toDTO),
    total: count ?? 0,
    limit: params.limit,
    offset: params.offset,
  }
}

export async function getMemberExternal(id: string): Promise<ExternalMemberDTO | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('members')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle<MemberRow>()
  if (error) throw error
  return data ? toDTO(data) : null
}
