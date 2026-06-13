import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { SessionPayload } from './session'
import { ChapterScope, applyScope, ScopeError } from './chapterScope'
import { writeActivityLog } from './activityLogService'

function stripScopeKeys<T extends Record<string, unknown>>(payload: T): T {
  const clone = { ...payload }
  delete clone.chapter_id
  delete clone.id
  return clone
}

// Members plus their linked login-account state (account_role / account_active),
// resolved by matching member email to the users table within the same scope.
export async function listMembers(scope: ChapterScope) {
  const query = applyScope(
    getSupabaseAdmin()
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    scope
  )
  const { data, error } = await query
  if (error) throw error

  const memberRows = data || []
  const emails = Array.from(
    new Set(memberRows.map(m => m.email?.trim()).filter(Boolean) as string[])
  )

  const accountByEmail = new Map<string, { role: string; is_active: boolean }>()
  if (emails.length > 0) {
    const accountQuery = applyScope(
      getSupabaseAdmin().from('users').select('email, role, is_active').in('email', emails),
      scope
    )
    const { data: accounts, error: accountError } = await accountQuery
    if (accountError) throw accountError
    for (const account of accounts || []) {
      if (account.email) {
        accountByEmail.set(account.email.trim().toLowerCase(), {
          role: account.role,
          is_active: account.is_active,
        })
      }
    }
  }

  return memberRows.map(member => {
    const account = member.email
      ? accountByEmail.get(member.email.trim().toLowerCase())
      : undefined
    return { ...member, account_role: account?.role, account_active: account?.is_active }
  })
}

async function findMember(scope: ChapterScope, id: string) {
  const query = applyScope(
    getSupabaseAdmin().from('members').select('*').eq('id', id),
    scope
  )
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function createMember(
  session: SessionPayload,
  scope: ChapterScope,
  payload: Record<string, unknown>
) {
  if (!scope.chapterId) throw new ScopeError('Chapter tujuan wajib dipilih.', 400)

  const insert = { ...stripScopeKeys(payload), chapter_id: scope.chapterId }
  const { data, error } = await getSupabaseAdmin()
    .from('members')
    .insert(insert)
    .select()
    .single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'insert',
    entity: 'member',
    entityId: data.id,
    entityLabel: data.name,
    newData: data,
  })
  return data
}

export async function updateMember(
  session: SessionPayload,
  scope: ChapterScope,
  id: string,
  updates: Record<string, unknown>
) {
  const existing = await findMember(scope, id)
  if (!existing) throw new ScopeError('Member tidak ditemukan pada chapter ini.', 404)

  const update = stripScopeKeys(updates)
  const query = applyScope(
    getSupabaseAdmin().from('members').update(update).eq('id', id),
    scope
  )
  const { data, error } = await query.select().single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'update',
    entity: 'member',
    entityId: id,
    entityLabel: data.name,
    oldData: existing,
    newData: data,
    metadata: { updates: update },
  })
  return data
}

export async function deleteMember(
  session: SessionPayload,
  scope: ChapterScope,
  id: string
) {
  const existing = await findMember(scope, id)
  if (!existing) throw new ScopeError('Member tidak ditemukan pada chapter ini.', 404)

  const query = applyScope(
    getSupabaseAdmin().from('members').delete().eq('id', id),
    scope
  )
  const { error } = await query
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'delete',
    entity: 'member',
    entityId: id,
    entityLabel: existing.name,
    oldData: existing,
  })
}
