// One-time backfill: give every existing chapter a primary <slug>.<base>
// subdomain. New chapters get one automatically via the master-data route;
// this covers chapters created before APP_BASE_DOMAIN was configured.
//
// Usage:
//   APP_BASE_DOMAIN=bnivisitor.id node scripts/backfill-chapter-domains.mjs
//   (or set APP_BASE_DOMAIN in .env.local)
//
// Reads Supabase creds from .env.local. Idempotent: skips chapters that
// already have a primary domain, and resolves slug collisions with a suffix.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]
  })
)

const BASE = (process.env.APP_BASE_DOMAIN || env.APP_BASE_DOMAIN || '')
  .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')

if (!BASE) {
  console.error('APP_BASE_DOMAIN belum diset. Contoh: APP_BASE_DOMAIN=bnivisitor.id node scripts/backfill-chapter-domains.mjs')
  process.exit(1)
}

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function slugify(name) {
  const s = (name || '').trim().toLowerCase()
    .replace(/^bni[\s_-]+/, '')
    .normalize('NFKD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'chapter'
}

async function uniqueDomain(slug) {
  let candidate = `${slug}.${BASE}`, n = 1
  while (true) {
    const { data } = await svc.from('chapter_domains').select('id').eq('domain', candidate).maybeSingle()
    if (!data) return candidate
    n += 1; candidate = `${slug}-${n}.${BASE}`
  }
}

const { data: chapters, error } = await svc.from('chapters').select('id, name, display_name').order('name')
if (error) { console.error(error); process.exit(1) }

console.log(`Base domain: ${BASE} — ${chapters.length} chapter`)
console.log('─'.repeat(60))
for (const ch of chapters) {
  const { data: primary } = await svc.from('chapter_domains')
    .select('domain').eq('chapter_id', ch.id).eq('is_primary', true).maybeSingle()
  if (primary?.domain) {
    console.log(`• ${ch.name.padEnd(20)} sudah punya domain: ${primary.domain} (skip)`)
    continue
  }
  const domain = await uniqueDomain(slugify(ch.name || ch.display_name))
  const { error: insErr } = await svc.from('chapter_domains').insert({
    chapter_id: ch.id, domain, type: 'subdomain', is_primary: true, is_active: true,
  })
  if (insErr) { console.error(`✗ ${ch.name}: ${insErr.message}`); continue }
  console.log(`✓ ${ch.name.padEnd(20)} → ${domain}`)
}
console.log('─'.repeat(60))
console.log('Selesai.')
