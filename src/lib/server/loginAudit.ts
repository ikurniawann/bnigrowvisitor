import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'

interface LoginAuditInput {
  email: string
  success: boolean
  reason?: string
  ip?: string | null
  userAgent?: string | null
  userId?: string | null
  chapterId?: string | null
  organizationId?: string | null
}

// Records a login attempt. Best-effort: a failure to write the audit row must
// never block or fail the login flow itself.
export async function recordLoginAttempt(input: LoginAuditInput): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('login_audit')
      .insert({
        email: input.email || null,
        success: input.success,
        reason: input.reason || null,
        ip: input.ip || null,
        user_agent: input.userAgent || null,
        user_id: input.userId || null,
        chapter_id: input.chapterId || null,
        organization_id: input.organizationId || null,
      })
    if (error) console.error('Login audit insert failed:', error.message)
  } catch (error) {
    console.error('Login audit insert threw:', error)
  }
}

// Best-effort client IP from common proxy headers.
export function clientIpFromHeaders(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')
}
