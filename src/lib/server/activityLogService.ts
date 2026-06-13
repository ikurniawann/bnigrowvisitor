import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { isMissingTableError } from './dbErrors'
import { SessionPayload } from './session'
import { ChapterScope, applyScope } from './chapterScope'

export type ActivityAction = 'insert' | 'update' | 'delete'

export interface ActivityLogInput {
  action: ActivityAction
  entity: string
  entityId?: string | null
  entityLabel?: string | null
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

// Writes an audit row. Actor identity comes from the verified session and the
// chapter from the resolved scope — neither is trusted from the client, so the
// trail cannot be forged. The target chapter defaults to the scoped chapter and
// falls back to the actor's home chapter for national-wide actions.
export async function writeActivityLog(
  session: SessionPayload,
  scope: ChapterScope,
  input: ActivityLogInput
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('activity_logs')
    .insert({
      actor_id: session.sub,
      actor_email: session.email,
      actor_role: session.role,
      organization_id: scope.organizationId,
      chapter_id: scope.chapterId ?? session.chapter_id ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      old_data: input.oldData ?? null,
      new_data: input.newData ?? null,
      metadata: input.metadata ?? null,
    })

  if (error && !isMissingTableError(error)) {
    // Audit failures must never break the underlying mutation; log and move on.
    console.error('Gagal menulis activity log:', error)
  }
}

export async function listActivityLogs(scope: ChapterScope, limit = 200) {
  const query = applyScope(
    getSupabaseAdmin()
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    scope
  )

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return []
    throw error
  }
  return data || []
}
