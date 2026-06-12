import { supabase, User } from './supabase'

export type ActivityAction = 'insert' | 'update' | 'delete'

export interface ActivityLog {
  id: string
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

function getCurrentActor(): User | null {
  if (typeof window === 'undefined') return null

  try {
    const storedUser = window.localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

export async function logActivity(input: LogActivityInput) {
  const actor = getCurrentActor()

  const { error } = await supabase
    .from('activity_logs')
    .insert({
      actor_id: actor?.id,
      actor_name: actor?.name,
      actor_email: actor?.email,
      actor_role: actor?.role,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      entity_label: input.entityLabel,
      old_data: input.oldData,
      new_data: input.newData,
      metadata: input.metadata,
    })

  if (error) {
    console.error('Error writing activity log:', error)
  }
}

export async function loadActivityLogs(limit = 200) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as ActivityLog[]
}
