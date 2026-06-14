import 'server-only'
import { withScopedSession, ok, fail } from '@/lib/server/apiHandler'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { writeActivityLog } from '@/lib/server/activityLogService'
import { readJson } from '@/lib/server/apiHandler'

export const dynamic = 'force-dynamic'

interface ImportVisitor {
  name: string
  gender?: string | null
  company?: string | null
  business_field?: string | null
  phone?: string | null
  email?: string | null
  referral_name?: string | null
  meeting_date?: string | null
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      const visitors = (body?.visitors ?? []) as ImportVisitor[]

      if (!Array.isArray(visitors) || visitors.length === 0) {
        return fail('Data visitor tidak boleh kosong.', 400)
      }

      if (visitors.length > 500) {
        return fail('Maksimal 500 visitor per import.', 400)
      }

      const chapterId = scope.chapterId!

      // Fetch existing phones in this chapter to detect duplicates
      const { data: existing, error: existErr } = await getSupabaseAdmin()
        .from('visitors')
        .select('phone')
        .eq('chapter_id', chapterId)
        .not('phone', 'is', null)

      if (existErr) throw existErr

      const existingPhones = new Set((existing || []).map((r: { phone: string }) => r.phone))

      const toInsert: Record<string, unknown>[] = []
      let duplicates = 0

      for (const v of visitors) {
        if (!v.name?.trim()) continue

        if (v.phone && existingPhones.has(v.phone)) {
          duplicates++
          continue
        }

        toInsert.push({
          chapter_id: chapterId,
          name: v.name.trim(),
          gender: v.gender || null,
          company: v.company || null,
          business_field: v.business_field || null,
          phone: v.phone || null,
          email: v.email || null,
          referral_name: v.referral_name || null,
          meeting_date: v.meeting_date || null,
          status: 'new',
        })
      }

      let imported = 0
      if (toInsert.length > 0) {
        const { data: inserted, error: insertErr } = await getSupabaseAdmin()
          .from('visitors')
          .insert(toInsert)
          .select('id')

        if (insertErr) throw insertErr
        imported = inserted?.length ?? 0

        await writeActivityLog(session, scope, {
          action: 'insert',
          entity: 'visitor',
          entityId: null,
          entityLabel: `bulk import ${imported} visitor dari BNI`,
          newData: { imported, duplicates },
        })
      }

      return ok({ imported, duplicates, total: visitors.length })
    },
    { requireChapter: true }
  )
}
