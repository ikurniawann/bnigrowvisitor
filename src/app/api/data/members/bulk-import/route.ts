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

      // Dedup against existing members in this chapter, by case-insensitive name.
      const { data: existing, error: existErr } = await getSupabaseAdmin()
        .from('members')
        .select('name')
        .eq('chapter_id', chapterId)
      if (existErr) throw existErr

      const existingNames = new Set(
        (existing || []).map((r: { name: string }) => r.name?.trim().toLowerCase()).filter(Boolean)
      )

      const toInsert: Record<string, unknown>[] = []
      const seen = new Set<string>() // also dedup within the uploaded file
      let duplicates = 0

      for (const m of members) {
        const name = m.name?.trim()
        if (!name) continue
        const key = name.toLowerCase()
        if (existingNames.has(key) || seen.has(key)) {
          duplicates++
          continue
        }
        seen.add(key)

        const role = m.role?.trim()
        const renewal =
          typeof m.renewal_date === 'string' && ISO_DATE.test(m.renewal_date) ? m.renewal_date : null
        const status = m.status?.trim().toLowerCase() || 'active'

        toInsert.push({
          chapter_id: chapterId,
          chapter: chapterName,
          name,
          business_field: m.business_field?.trim() || null,
          status,
          // The dues report has no join date; only the Due Date (= renewal).
          // Leave joined_date empty rather than defaulting to the import date,
          // so no misleading "tanggal bergabung" is recorded.
          joined_date: null,
          renewal_date: renewal,
          // Preserve leadership/role info from the report's "Type" column.
          notes: role && role.toLowerCase() !== 'member' ? `Peran: ${role}` : null,
        })
      }

      let imported = 0
      if (toInsert.length > 0) {
        const { data: inserted, error: insertErr } = await getSupabaseAdmin()
          .from('members')
          .insert(toInsert)
          .select('id')
        if (insertErr) throw insertErr
        imported = inserted?.length ?? 0

        await writeActivityLog(session, scope, {
          action: 'insert',
          entity: 'member',
          entityId: null,
          entityLabel: `bulk import ${imported} member`,
          newData: { imported, duplicates, total: members.length },
        })
      }

      return ok({ imported, duplicates, total: members.length })
    },
    { requireChapter: true }
  )
}
