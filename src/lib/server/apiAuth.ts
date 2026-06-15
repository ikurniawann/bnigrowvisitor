import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from './supabaseAdmin'

// Raw keys look like `bnifin_<43 base64url chars>`. The prefix makes the key
// self-describing in logs/dashboards; only the SHA-256 hash is persisted.
const KEY_PREFIX = 'bnifin_'
const DISPLAY_PREFIX_LENGTH = 14

export interface ApiKeyRecord {
  id: string
  name: string
  scope: string
  organization_id: string | null
  is_active: boolean
  expires_at: string | null
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

// Generates a fresh key. The raw value is returned ONCE to the caller (to hand
// to the integrator); we only ever store `hash` + `displayPrefix`.
export function generateApiKey(): { rawKey: string; hash: string; displayPrefix: string } {
  const rawKey = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  return {
    rawKey,
    hash: hashApiKey(rawKey),
    displayPrefix: rawKey.slice(0, DISPLAY_PREFIX_LENGTH),
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

// Resolves the bearer token to an active, unexpired key. Lookup is by hash (the
// raw key is never compared in clear), so a constant-time string compare is
// unnecessary — an attacker only ever controls the pre-image, not the stored
// hash. Returns null on any miss; the caller turns that into a 401.
export async function authenticateApiKey(request: Request): Promise<ApiKeyRecord | null> {
  const token = extractBearerToken(request)
  if (!token) return null

  const { data, error } = await getSupabaseAdmin()
    .from('api_keys')
    .select('id, name, scope, organization_id, is_active, expires_at')
    .eq('key_hash', hashApiKey(token))
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null

  // Best-effort usage stamp; never block the request on it.
  void getSupabaseAdmin()
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(undefined, () => undefined)

  return data as ApiKeyRecord
}

export interface ApiKeyContext {
  apiKey: ApiKeyRecord
}

// Wraps an external API route with bearer-key auth and a clean JSON envelope.
// External keys are national in scope (they see every chapter); the handler
// narrows by query param when needed.
export async function withApiKey(
  request: Request,
  handler: (ctx: ApiKeyContext) => Promise<NextResponse>,
  options: { requiredScope?: string } = {}
): Promise<NextResponse> {
  const apiKey = await authenticateApiKey(request)
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized: API key tidak valid atau tidak aktif.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
    )
  }

  if (options.requiredScope && apiKey.scope !== options.requiredScope) {
    return NextResponse.json(
      { error: `Forbidden: API key tidak memiliki scope "${options.requiredScope}".` },
      { status: 403 }
    )
  }

  try {
    return await handler({ apiKey })
  } catch (error) {
    console.error('External API error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
