import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { SessionPayload } from './session'
import { ChapterScope, applyScope, ScopeError } from './chapterScope'
import { writeActivityLog } from './activityLogService'

const GUEST_SELECT = `
  *,
  meeting:meeting_id (id, title, meeting_date)
`

function stripScopeKeys<T extends Record<string, unknown>>(payload: T): T {
  const clone = { ...payload }
  delete clone.chapter_id
  delete clone.id
  return clone
}

export async function listGuests(scope: ChapterScope) {
  const query = applyScope(
    getSupabaseAdmin()
      .from('guests')
      .select(GUEST_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    scope
  )
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findGuest(scope: ChapterScope, id: string) {
  const query = applyScope(
    getSupabaseAdmin().from('guests').select('*').eq('id', id),
    scope
  )
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function createGuest(
  session: SessionPayload,
  scope: ChapterScope,
  payload: Record<string, unknown>
) {
  if (!scope.chapterId) throw new ScopeError('Chapter tujuan wajib dipilih.', 400)

  const insert = { ...stripScopeKeys(payload), chapter_id: scope.chapterId }
  const { data, error } = await getSupabaseAdmin()
    .from('guests')
    .insert(insert)
    .select()
    .single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'insert',
    entity: 'guest',
    entityId: data.id,
    entityLabel: data.name,
    newData: data,
  })
  return data
}

export async function updateGuest(
  session: SessionPayload,
  scope: ChapterScope,
  id: string,
  updates: Record<string, unknown>
) {
  const existing = await findGuest(scope, id)
  if (!existing) throw new ScopeError('Guest tidak ditemukan pada chapter ini.', 404)

  const update = stripScopeKeys(updates)
  const query = applyScope(
    getSupabaseAdmin().from('guests').update(update).eq('id', id),
    scope
  )
  const { data, error } = await query.select().single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'update',
    entity: 'guest',
    entityId: id,
    entityLabel: data.name,
    oldData: existing,
    newData: data,
    metadata: { updates: update },
  })
  return data
}

export async function deleteGuest(
  session: SessionPayload,
  scope: ChapterScope,
  id: string
) {
  const existing = await findGuest(scope, id)
  if (!existing) throw new ScopeError('Guest tidak ditemukan pada chapter ini.', 404)

  const query = applyScope(
    getSupabaseAdmin().from('guests').delete().eq('id', id),
    scope
  )
  const { error } = await query
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'delete',
    entity: 'guest',
    entityId: id,
    entityLabel: existing.name,
    oldData: existing,
  })
}
