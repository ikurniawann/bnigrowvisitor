import { apiGet, apiSend } from './dataClient'

export type ActivityAction = 'insert' | 'update' | 'delete'

export interface ActivityLog {
  id: string
  organization_id?: string
  chapter_id?: string
  actor_id?: string
  actor_name?: string
  actor_email?: string
  actor_role?: string
  action: ActivityAction
  entity: string
  entity_id?: string
  entity_label?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string
}

interface LogActivityInput {
  action: ActivityAction
  entity: string
  entityId?: string
  entityLabel?: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

// Writes an audit entry through the server, which derives actor identity and
// chapter from the verified session — the client can no longer forge them.
// Best-effort: never let a logging failure break the calling action.
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await apiSend('activity-logs', 'POST', {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      oldData: input.oldData,
      newData: input.newData,
      metadata: input.metadata,
    })
  } catch (error) {
    console.error('Error writing activity log:', error)
  }
}

export async function loadActivityLogs(limit = 200): Promise<ActivityLog[]> {
  return apiGet<ActivityLog[]>(`activity-logs?limit=${limit}`)
}
