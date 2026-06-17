import 'server-only'
import { withScopedSession, ok, fail, readJson } from '@/lib/server/apiHandler'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { writeActivityLog } from '@/lib/server/activityLogService'

export const dynamic = 'force-dynamic'

interface ImportVisitor {
  name: string
  gender?: string | null
  company?: string | null
  business_field?: string | null
  phone?: string | null
  email?: string | null
  referral_name?: string | null
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      const visitors = (body?.visitors ?? []) as ImportVisitor[]
      const meetingId: string | null = typeof body?.meetingId === 'string' ? body.meetingId : null
      // When true, visitors already in this meeting get their info refreshed
      // (status is never touched); otherwise they are skipped.
      const updateExisting = body?.updateExisting === true

      if (!Array.isArray(visitors) || visitors.length === 0) {
        return fail('Data visitor tidak boleh kosong.', 400)
      }

      if (visitors.length > 500) {
        return fail('Maksimal 500 visitor per import.', 400)
      }

      if (!meetingId) {
        return fail('Weekly meeting wajib dipilih sebelum import.', 400)
      }

      const chapterId = scope.chapterId!

      // Validate meeting belongs to this chapter and get its date
      const { data: meeting, error: meetingErr } = await getSupabaseAdmin()
        .from('meetings')
        .select('id, title, meeting_date')
        .eq('id', meetingId)
        .eq('chapter_id', chapterId)
        .maybeSingle()

      if (meetingErr) throw meetingErr
      if (!meeting) return fail('Weekly meeting tidak ditemukan pada chapter ini.', 404)

      const meetingDate: string = meeting.meeting_date

      const admin = getSupabaseAdmin()
      const digits = (s: string | null | undefined) => (s || '').replace(/[^0-9]/g, '')

      // Match against visitors already IN THIS MEETING (by WA, fallback name),
      // so a re-upload of the same meeting updates/skips instead of duplicating.
      const { data: existing, error: existErr } = await admin
        .from('visitors')
        .select('id, name, phone')
        .eq('chapter_id', chapterId)
        .eq('meeting_id', meetingId)
      if (existErr) throw existErr

      const byPhone = new Map<string, string>()
      const byName = new Map<string, string>()
      for (const r of existing || []) {
        const ph = digits(r.phone)
        if (ph) byPhone.set(ph, r.id)
        const nm = r.name?.trim().toLowerCase()
        if (nm) byName.set(nm, r.id)
      }

      const toInsert: Record<string, unknown>[] = []
      const toUpdate: { id: string; patch: Record<string, unknown> }[] = []
      const seenPhone = new Set<string>()
      const seenName = new Set<string>()
      let skipped = 0

      for (const v of visitors) {
        const name = v.name?.trim()
        if (!name) continue
        const ph = digits(v.phone)
        const nm = name.toLowerCase()

        // Dedup within the uploaded file itself.
        if ((ph && seenPhone.has(ph)) || (!ph && seenName.has(nm))) {
          skipped++
          continue
        }
        if (ph) seenPhone.add(ph)
        else seenName.add(nm)

        const matchId = (ph && byPhone.get(ph)) || byName.get(nm)
        if (matchId) {
          if (!updateExisting) {
            skipped++
            continue
          }
          // Refresh info only — never touch status or meeting_id. Only set
          // fields the file actually carries (don't blank out existing data).
          const patch: Record<string, unknown> = {}
          if (v.gender) patch.gender = v.gender
          if (v.company) patch.company = v.company
          if (v.business_field) patch.business_field = v.business_field
          if (v.phone) patch.phone = v.phone
          if (v.email) patch.email = v.email
          if (v.referral_name) patch.referral_name = v.referral_name
          toUpdate.push({ id: matchId, patch })
          continue
        }

        toInsert.push({
          chapter_id: chapterId,
          name,
          gender: v.gender || null,
          company: v.company || null,
          business_field: v.business_field || null,
          phone: v.phone || null,
          email: v.email || null,
          referral_name: v.referral_name || null,
          meeting_id: meetingId,
          meeting_date: meetingDate,
          status: 'new',
        })
      }

      let imported = 0
      if (toInsert.length > 0) {
        const { data: inserted, error: insertErr } = await admin
          .from('visitors')
          .insert(toInsert)
          .select('id')
        if (insertErr) throw insertErr
        imported = inserted?.length ?? 0
      }

      // Apply info updates in small concurrent batches. Empty patches (matched
      // but nothing new in the file) still count as updated = recognised, no-op.
      let updated = 0
      const withChanges = toUpdate.filter(u => Object.keys(u.patch).length > 0)
      const CHUNK = 25
      for (let i = 0; i < withChanges.length; i += CHUNK) {
        const batch = withChanges.slice(i, i + CHUNK)
        const results = await Promise.all(
          batch.map(u =>
            admin
              .from('visitors')
              .update(u.patch)
              .eq('id', u.id)
              .eq('chapter_id', chapterId)
              .then(res => !res.error)
          )
        )
        updated += results.filter(Boolean).length
      }
      updated += toUpdate.length - withChanges.length // matched, nothing to change

      if (imported > 0 || updated > 0) {
        await writeActivityLog(session, scope, {
          action: imported >= updated ? 'insert' : 'update',
          entity: 'visitor',
          entityId: null,
          entityLabel: `import visitor ke ${meeting.title}: +${imported} baru, ${updated} diperbarui`,
          newData: { imported, updated, skipped, meetingId, updateExisting },
        })
      }

      return ok({ imported, updated, skipped, total: visitors.length })
    },
    { requireChapter: true }
  )
}
