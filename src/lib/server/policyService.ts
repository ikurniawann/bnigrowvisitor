import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { PolicyType, mergePolicyConfig } from '@/lib/national/policies'

const POLICY_COLUMNS = 'id, chapter_id, policy_type, config, updated_at'

export interface PolicyRow {
  id: string
  chapter_id: string | null
  policy_type: string
  config: Record<string, unknown>
  updated_at?: string
}

// All policy rows (defaults + overrides). Tolerant of the table not existing.
export async function listPolicies(): Promise<{ rows: PolicyRow[]; pendingMigration: boolean }> {
  const { data, error } = await getSupabaseAdmin().from('national_policies').select(POLICY_COLUMNS)
  if (error) {
    if (error.code === '42P01') return { rows: [], pendingMigration: true }
    throw error
  }
  return { rows: (data as PolicyRow[]) || [], pendingMigration: false }
}

// Effective config per policy type for one chapter: override merged over default.
export async function resolvePoliciesForChapter(chapterId: string) {
  const { rows } = await listPolicies()
  const result: Record<string, Record<string, unknown>> = {}
  const defaults = new Map<string, Record<string, unknown>>()
  const overrides = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    if (row.chapter_id === chapterId) overrides.set(row.policy_type, row.config)
    else if (!row.chapter_id) defaults.set(row.policy_type, row.config)
  }

  const types = new Set<string>([...defaults.keys(), ...overrides.keys()])
  for (const type of types) {
    result[type] = mergePolicyConfig(defaults.get(type) || null, overrides.get(type) || null)
  }
  return result
}

export async function upsertPolicy(
  policyType: PolicyType,
  chapterId: string | null,
  config: Record<string, unknown>,
  organizationId?: string | null
) {
  const admin = getSupabaseAdmin()
  const values = { config, updated_at: new Date().toISOString() }

  // National default (chapter_id NULL) can't use ON CONFLICT — handle by hand.
  if (chapterId === null) {
    const { data: existing, error: findError } = await admin
      .from('national_policies')
      .select('id')
      .is('chapter_id', null)
      .eq('policy_type', policyType)
      .maybeSingle()
    if (findError) throw findError

    if (existing) {
      const { error } = await admin.from('national_policies').update(values).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await admin.from('national_policies').insert({
        ...values,
        chapter_id: null,
        policy_type: policyType,
        organization_id: organizationId ?? null,
      })
      if (error) throw error
    }
    return
  }

  const { error } = await admin
    .from('national_policies')
    .upsert(
      { ...values, chapter_id: chapterId, policy_type: policyType, organization_id: organizationId ?? null },
      { onConflict: 'chapter_id,policy_type' }
    )
  if (error) throw error
}

export async function deletePolicyOverride(policyType: PolicyType, chapterId: string) {
  const { error } = await getSupabaseAdmin()
    .from('national_policies')
    .delete()
    .eq('policy_type', policyType)
    .eq('chapter_id', chapterId)
  if (error) throw error
}
