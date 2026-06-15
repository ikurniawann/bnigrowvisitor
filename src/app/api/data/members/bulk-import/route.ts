import 'server-only'
import { withScopedSession, ok, fail, readJson } from '@/lib/server/apiHandler'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { writeActivityLog } from '@/lib/server/activityLogService'

export const dynamic = 'force-dynamic'

interface ImportMember {
  name: string
  business_field?: string | null
  status?: string | null
  renewal_date?: string | null
  role?: string | null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      const members = (body?.members ?? []) as ImportMember[]
      // When true, members matching by name are updated instead of skipped.
      const updateExisting = body?.updateExisting === true

      if (!Array.isArray(members) || members.length === 0) {
        return fail('Data member tidak boleh kosong.', 400)
      }
      if (members.length > 1000) {
        return fail('Maksimal 1000 member per import.', 400)
      }

      const chapterId = scope.chapterId!

      // Resolve the chapter's display name so the legacy `chapter` text column
      // stays populated (kept in sync with how createMember stores it).
      const { data: chapterRow } = await getSupabaseAdmin()
        .from('chapters')
        .select('display_name')
        .eq('id', chapterId)
        .maybeSingle()
      const chapterName: string | null = chapterRow?.display_name ?? null

      // Existing members in this chapter, keyed by case-insensitive name. We
      // need their id + current values to decide updates without clobbering
      // manually-entered data.
      const { data: existing, error: existErr } = await getSupabaseAdmin()
        .from('members')
        .select('id, name, business_field, status, renewal_date, notes')
        .eq('chapter_id', chapterId)
      if (existErr) throw existErr

      const existingByName = new Map<string, { id: string; notes: string | null }>()
      for (const r of existing || []) {
        const key = r.name?.trim().toLowerCase()
        if (key) existingByName.set(key, { id: r.id, notes: r.notes ?? null })
      }

      const toInsert: Record<string, unknown>[] = []
      const toUpdate: { id: string; patch: Record<string, unknown> }[] = []
      const seen = new Set<string>() // dedup within the uploaded file
      let skipped = 0

      for (const m of members) {
        const name = m.name?.trim()
        if (!name) continue
        const key = name.toLowerCase()
        if (seen.has(key)) {
          skipped++
          continue
        }
        seen.add(key)

        const role = m.role?.trim()
        const renewal =
          typeof m.renewal_date === 'string' && ISO_DATE.test(m.renewal_date) ? m.renewal_date : null
        const businessField = m.business_field?.trim() || null
        const status = m.status?.trim().toLowerCase() || 'active'
        const roleNote = role && role.toLowerCase() !== 'member' ? `Peran: ${role}` : null

        const match = existingByName.get(key)
        if (match) {
          if (!updateExisting) {
            skipped++
            continue
          }
          // Overwrite only fields the file actually carries; never touch
          // company/phone/email, and only set notes when none exist yet.
          const patch: Record<string, unknown> = { status }
          if (businessField) patch.business_field = businessField
          if (renewal) patch.renewal_date = renewal
          if (roleNote && !match.notes?.trim()) patch.notes = roleNote
          toUpdate.push({ id: match.id, patch })
          continue
        }

        toInsert.push({
          chapter_id: chapterId,
          chapter: chapterName,
          name,
          business_field: businessField,
          status,
          // The dues report has no join date; only the Due Date (= renewal).
          // Leave joined_date empty rather than defaulting to the import date.
          joined_date: null,
          renewal_date: renewal,
          notes: roleNote,
        })
      }

      const admin = getSupabaseAdmin()

      let imported = 0
      if (toInsert.length > 0) {
        const { data: inserted, error: insertErr } = await admin
          .from('members')
          .insert(toInsert)
          .select('id')
        if (insertErr) throw insertErr
        imported = inserted?.length ?? 0
      }

      // Apply updates in small concurrent batches to avoid a request storm.
      let updated = 0
      const CHUNK = 25
      for (let i = 0; i < toUpdate.length; i += CHUNK) {
        const batch = toUpdate.slice(i, i + CHUNK)
        const results = await Promise.all(
          batch.map(u =>
            admin
              .from('members')
              .update(u.patch)
              .eq('id', u.id)
              .eq('chapter_id', chapterId)
              .then(res => !res.error)
          )
        )
        updated += results.filter(Boolean).length
      }

      if (imported > 0 || updated > 0) {
        await writeActivityLog(session, scope, {
          action: imported >= updated ? 'insert' : 'update',
          entity: 'member',
          entityId: null,
          entityLabel: `import member: +${imported} baru, ${updated} diperbarui`,
          newData: { imported, updated, skipped, total: members.length, updateExisting },
        })
      }

      return ok({ imported, updated, skipped, total: members.length })
    },
    { requireChapter: true }
  )
}
