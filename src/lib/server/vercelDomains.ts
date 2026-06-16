import 'server-only'

// Attaches a domain to the Vercel project so it gets an HTTPS certificate.
// DNS for *.<base> is a wildcard pointing at Vercel, so a new subdomain already
// resolves — the only missing piece for a secure (HTTPS) chapter subdomain is
// registering it on the project, which triggers automatic cert issuance.
//
// Requires VERCEL_TOKEN (a Vercel API token). When unset, this is a graceful
// no-op so chapter creation still works; the subdomain can then be added
// manually (`vercel domains add <domain>`). Project/team IDs default to this
// project but can be overridden via env.
const DEFAULT_PROJECT_ID = 'prj_65l0bDd6iA7nLjxqavSENy6lcKEs'
const DEFAULT_TEAM_ID = 'team_2kgXJfDoczan8qdrMGqHE2Uo'

export interface VercelDomainResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function addDomainToVercel(domain: string): Promise<VercelDomainResult> {
  const token = process.env.VERCEL_TOKEN
  if (!token) return { ok: false, skipped: true }

  const projectId = process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID || DEFAULT_TEAM_ID
  const url = `https://api.vercel.com/v10/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ''}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: domain }),
    })
    if (res.ok) return { ok: true }

    const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } }
    const code = data?.error?.code
    // Already attached to this project → idempotent success.
    if (res.status === 409 || code === 'domain_already_in_use' || code === 'domain_already_exists') {
      return { ok: true }
    }
    return { ok: false, error: data?.error?.message || `Vercel API error ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Vercel API request gagal.' }
  }
}
