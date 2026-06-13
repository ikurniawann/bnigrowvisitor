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

export async function listMeetings(scope: ChapterScope) {
  const query = applyScope(
    getSupabaseAdmin()
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false }),
    scope
  )
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findMeeting(scope: ChapterScope, id: string) {
  const query = applyScope(
    getSupabaseAdmin().from('meetings').select('*').eq('id', id),
    scope
  )
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function createMeeting(
  session: SessionPayload,
  scope: ChapterScope,
  payload: Record<string, unknown>
) {
  if (!scope.chapterId) throw new ScopeError('Chapter tujuan wajib dipilih.', 400)

  const insert = { ...stripScopeKeys(payload), chapter_id: scope.chapterId }
  const { data, error } = await getSupabaseAdmin()
    .from('meetings')
    .insert(insert)
    .select()
    .single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'insert',
    entity: 'meeting',
    entityId: data.id,
    entityLabel: data.title,
    newData: data,
  })
  return data
}

export async function updateMeeting(
  session: SessionPayload,
  scope: ChapterScope,
  id: string,
  updates: Record<string, unknown>
) {
  const existing = await findMeeting(scope, id)
  if (!existing) throw new ScopeError('Meeting tidak ditemukan pada chapter ini.', 404)

  const update = stripScopeKeys(updates)
  const query = applyScope(
    getSupabaseAdmin().from('meetings').update(update).eq('id', id),
    scope
  )
  const { data, error } = await query.select().single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'update',
    entity: 'meeting',
    entityId: id,
    entityLabel: data.title,
    oldData: existing,
    newData: data,
    metadata: { updates: update },
  })
  return data
}

export async function deleteMeeting(
  session: SessionPayload,
  scope: ChapterScope,
  id: string
) {
  const existing = await findMeeting(scope, id)
  if (!existing) throw new ScopeError('Meeting tidak ditemukan pada chapter ini.', 404)

  const query = applyScope(
    getSupabaseAdmin().from('meetings').delete().eq('id', id),
    scope
  )
  const { error } = await query
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'delete',
    entity: 'meeting',
    entityId: id,
    entityLabel: existing.title,
    oldData: existing,
  })
}
