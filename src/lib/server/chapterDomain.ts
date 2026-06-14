import 'server-only'
import { SupabaseClient } from '@supabase/supabase-js'

// The apex domain every chapter subdomain hangs off of, e.g. "bnivisitor.id".
// National admin uses the apex itself; each chapter gets <slug>.<base>. Unset
// (no custom domain wired yet) => auto-domain generation is dormant and nothing
// breaks. Configure in .env.local / Vercel env as APP_BASE_DOMAIN.
export function getBaseDomain(): string {
  return (process.env.APP_BASE_DOMAIN || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
}

// "BNI Rise" -> "rise", "BNI Grow Chapter" -> "grow-chapter". Drops a leading
// "BNI", lowercases, and reduces to a DNS-safe label.
export function slugifyChapterName(name: string): string {
  const slug = (name || '')
    .trim()
    .toLowerCase()
    .replace(/^bni[\s_-]+/, '')
    .normalize('NFKD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'chapter'
}

// Generates a unique <slug>.<base> domain and inserts it as the chapter's
// primary domain. No-op (returns null) when APP_BASE_DOMAIN is unset or the
// chapter already has a primary domain. Collisions get a numeric suffix.
export async function ensureChapterDomain(
  admin: SupabaseClient,
  chapterId: string,
  chapterName: string
): Promise<string | null> {
  const base = getBaseDomain()
  if (!base) return null

  const { data: existingPrimary } = await admin
    .from('chapter_domains')
    .select('domain')
    .eq('chapter_id', chapterId)
    .eq('is_primary', true)
    .maybeSingle()
  if (existingPrimary?.domain) return existingPrimary.domain

  const slug = slugifyChapterName(chapterName)
  let candidate = `${slug}.${base}`
  let suffix = 1
  // domain carries a UNIQUE constraint — resolve clashes deterministically.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: taken } = await admin
      .from('chapter_domains')
      .select('id')
      .eq('domain', candidate)
      .maybeSingle()
    if (!taken) break
    suffix += 1
    candidate = `${slug}-${suffix}.${base}`
  }

  const { error } = await admin.from('chapter_domains').insert({
    chapter_id: chapterId,
    domain: candidate,
    type: 'subdomain',
    is_primary: true,
    is_active: true,
  })
  if (error) throw error
  return candidate
}
