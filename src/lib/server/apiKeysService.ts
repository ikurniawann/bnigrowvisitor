import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { generateApiKey } from './apiAuth'

// Never selects key_hash — the raw key is unrecoverable by design and the hash
// has no business surfacing in the admin UI.
const LIST_COLUMNS =
  'id, name, key_prefix, scope, is_active, organization_id, created_by, last_used_at, expires_at, created_at'

export async function listApiKeys() {
  const { data, error } = await getSupabaseAdmin()
    .from('api_keys')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export interface CreateApiKeyInput {
  name: string
  scope?: string
  organizationId?: string | null
  createdBy?: string | null
  expiresAt?: string | null
}

// Returns the persisted metadata PLUS the raw key, which is shown to the admin
// exactly once and never stored.
export async function createApiKey(input: CreateApiKeyInput) {
  const { rawKey, hash, displayPrefix } = generateApiKey()

  const { data, error } = await getSupabaseAdmin()
    .from('api_keys')
    .insert({
      name: input.name,
      key_prefix: displayPrefix,
      key_hash: hash,
      scope: input.scope || 'finance',
      organization_id: input.organizationId ?? null,
      created_by: input.createdBy ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select(LIST_COLUMNS)
    .single()
  if (error) throw error

  return { ...data, rawKey }
}

export async function revokeApiKey(id: string) {
  const { error } = await getSupabaseAdmin()
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}
