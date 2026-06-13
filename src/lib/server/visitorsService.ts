import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { SessionPayload } from './session'
import { ChapterScope, applyScope, ScopeError } from './chapterScope'
import { writeActivityLog } from './activityLogService'

const VISITOR_SELECT = `
  *,
  pic:pic_id (id, name, business_classification),
  meeting:meeting_id (id, title, meeting_date),
  referred_by_member:referred_by_member_id (id, name)
`

// chapter_id is owned by the server scope; a client must never set or move it.
function stripScopeKeys<T extends Record<string, unknown>>(payload: T): T {
  const clone = { ...payload }
  delete clone.chapter_id
  delete clone.id
  return clone
}

export async function listVisitors(scope: ChapterScope) {
  const query = applyScope(
    getSupabaseAdmin()
      .from('visitors')
      .select(VISITOR_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
    scope
  )
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findVisitor(scope: ChapterScope, id: string) {
  const query = applyScope(
    getSupabaseAdmin().from('visitors').select('*').eq('id', id),
    scope
  )
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function createVisitor(
  session: SessionPayload,
  scope: ChapterScope,
  payload: Record<string, unknown>
) {
  if (!scope.chapterId) throw new ScopeError('Chapter tujuan wajib dipilih.', 400)

  const insert = { ...stripScopeKeys(payload), chapter_id: scope.chapterId }
  const { data, error } = await getSupabaseAdmin()
    .from('visitors')
    .insert(insert)
    .select()
    .single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'insert',
    entity: 'visitor',
    entityId: data.id,
    entityLabel: data.name,
    newData: data,
  })
  return data
}

export async function updateVisitor(
  session: SessionPayload,
  scope: ChapterScope,
  id: string,
  updates: Record<string, unknown>
) {
  const existing = await findVisitor(scope, id)
  if (!existing) throw new ScopeError('Visitor tidak ditemukan pada chapter ini.', 404)

  const update = stripScopeKeys(updates)
  const query = applyScope(
    getSupabaseAdmin().from('visitors').update(update).eq('id', id),
    scope
  )
  const { data, error } = await query.select().single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'update',
    entity: 'visitor',
    entityId: id,
    entityLabel: data.name,
    oldData: existing,
    newData: data,
    metadata: { updates: update },
  })
  return data
}

export async function deleteVisitor(
  session: SessionPayload,
  scope: ChapterScope,
  id: string
) {
  const existing = await findVisitor(scope, id)
  if (!existing) throw new ScopeError('Visitor tidak ditemukan pada chapter ini.', 404)

  const query = applyScope(
    getSupabaseAdmin().from('visitors').delete().eq('id', id),
    scope
  )
  const { error } = await query
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'delete',
    entity: 'visitor',
    entityId: id,
    entityLabel: existing.name,
    oldData: existing,
  })
}
