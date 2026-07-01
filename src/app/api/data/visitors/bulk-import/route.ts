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
  meeting_format?: string | null
  visit_date?: string | null
  source_type?: string | null
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      const visitors = (body?.visitors ?? []) as ImportVisitor[]
      const guests = (body?.guests ?? []) as ImportVisitor[]
      const meetingId: string | null = typeof body?.meetingId === 'string' ? body.meetingId : null
      // When true, visitors already in this meeting get their info refreshed
      // (status is never touched); otherwise they are skipped.
      const updateExisting = body?.updateExisting === true

      if (!Array.isArray(visitors) || !Array.isArray(guests) || visitors.length + guests.length === 0) {
        return fail('Data visitor/guest tidak boleh kosong.', 400)
      }

      if (visitors.length + guests.length > 500) {
        return fail('Maksimal 500 baris per import.', 400)
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
      const normPhone = (s: string | null | undefined) => (s || '').trim()
      const isDuplicateError = (error: { code?: string; message?: string } | null | undefined) =>
        error?.code === '23505' || /duplicate key/i.test(error?.message || '')

      // Match within THIS meeting only (by WA, name fallback). visitors.phone is
      // unique per meeting (migration 015), so a returning visitor can be added
      // to other meetings while a re-import of the same meeting updates/skips
      // instead of duplicating.
      const { data: existing, error: existErr } = await admin
        .from('visitors')
        .select('id, name, phone')
        .eq('chapter_id', chapterId)
        .eq('meeting_id', meetingId)
      if (existErr) throw existErr

      const byPhone = new Map<string, string>()
      const byName = new Map<string, string>()
      for (const r of existing || []) {
        const ph = normPhone(r.phone)
        if (ph) byPhone.set(ph, r.id)
        const nm = r.name?.trim().toLowerCase()
        if (nm) byName.set(nm, r.id)
      }

      // Status and meeting_id are deliberately excluded — a re-import never
      // changes a visitor's pipeline status or moves them between meetings.
      const buildPatch = (v: ImportVisitor): Record<string, unknown> => {
        const patch: Record<string, unknown> = {}
        if (v.gender) patch.gender = v.gender
        if (v.company) patch.company = v.company
        if (v.business_field) patch.business_field = v.business_field
        if (v.email) patch.email = v.email
        if (v.referral_name) patch.referral_name = v.referral_name
        return patch
      }

      const toInsert: Record<string, unknown>[] = []
      const toUpdate: { id: string; patch: Record<string, unknown> }[] = []
      const seenPhone = new Set<string>()
      const seenName = new Set<string>()
      let skipped = 0

      for (const v of visitors) {
        const name = v.name?.trim()
        if (!name) continue
        const phone = normPhone(v.phone)
        const nm = name.toLowerCase()

        // Dedup within the uploaded file itself.
        if ((phone && seenPhone.has(phone)) || (!phone && seenName.has(nm))) {
          skipped++
          continue
        }
        if (phone) seenPhone.add(phone)
        else seenName.add(nm)

        const matchId = (phone && byPhone.get(phone)) || (!phone && byName.get(nm))
        if (matchId) {
          if (updateExisting) {
            toUpdate.push({ id: matchId, patch: buildPatch(v) })
          } else {
            skipped++
          }
          continue
        }

        toInsert.push({
          chapter_id: chapterId,
          name,
          gender: v.gender || null,
          company: v.company || null,
          business_field: v.business_field || null,
          phone: phone || null,
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
        if (insertErr) {
          if (!isDuplicateError(insertErr)) throw insertErr

          // Production may still have the legacy global unique constraint on
          // visitors.phone. Do not let one returning visitor abort the whole
          // file and prevent Guest rows from being imported.
          for (const row of toInsert) {
            const { error: rowErr } = await admin.from('visitors').insert(row)
            if (rowErr) {
              if (isDuplicateError(rowErr)) {
                skipped++
                continue
              }
              throw rowErr
            }
            imported++
          }
        } else {
          imported = inserted?.length ?? 0
        }
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

      const importGuestRows = async () => {
        if (guests.length === 0) return { imported: 0, updated: 0, skipped: 0 }

        const { data: existingGuests, error: guestExistErr } = await admin
          .from('guests')
          .select('id, name, phone')
          .eq('chapter_id', chapterId)
          .eq('meeting_id', meetingId)
        if (guestExistErr) throw guestExistErr

        const guestByPhone = new Map<string, string>()
        const guestByName = new Map<string, string>()
        for (const r of existingGuests || []) {
          const ph = normPhone(r.phone)
          if (ph) guestByPhone.set(ph, r.id)
          const nm = r.name?.trim().toLowerCase()
          if (nm) guestByName.set(nm, r.id)
        }

        const buildGuestPatch = (v: ImportVisitor): Record<string, unknown> => {
          const patch: Record<string, unknown> = {}
          if (v.gender) patch.gender = v.gender
          if (v.company) patch.company = v.company
          if (v.business_field) patch.business_field = v.business_field
          if (v.email) patch.email = v.email
          if (v.referral_name) patch.referral_name = v.referral_name
          if (v.meeting_format) patch.meeting_format = v.meeting_format
          if (v.visit_date) patch.visit_date = v.visit_date
          if (v.source_type) patch.source_type = v.source_type
          return patch
        }

        const guestInserts: Record<string, unknown>[] = []
        const guestUpdates: { id: string; patch: Record<string, unknown> }[] = []
        const seenGuestPhone = new Set<string>()
        const seenGuestName = new Set<string>()
        let guestSkipped = 0

        for (const v of guests) {
          const name = v.name?.trim()
          if (!name) continue
          const phone = normPhone(v.phone)
          const nm = name.toLowerCase()

          if ((phone && seenGuestPhone.has(phone)) || (!phone && seenGuestName.has(nm))) {
            guestSkipped++
            continue
          }
          if (phone) seenGuestPhone.add(phone)
          else seenGuestName.add(nm)

          const matchId = (phone && guestByPhone.get(phone)) || (!phone && guestByName.get(nm))
          if (matchId) {
            if (updateExisting) guestUpdates.push({ id: matchId, patch: buildGuestPatch(v) })
            else guestSkipped++
            continue
          }

          guestInserts.push({
            chapter_id: chapterId,
            name,
            gender: v.gender || null,
            company: v.company || null,
            business_field: v.business_field || null,
            phone: phone || null,
            email: v.email || null,
            referral_name: v.referral_name || null,
            meeting_id: meetingId,
            meeting_date: meetingDate,
            meeting_format: v.meeting_format || null,
            visit_date: v.visit_date || null,
            source_type: v.source_type || 'Guest',
          })
        }

        let guestImported = 0
        if (guestInserts.length > 0) {
          const { data: insertedGuests, error: guestInsertErr } = await admin
            .from('guests')
            .insert(guestInserts)
            .select('id')
          if (guestInsertErr) {
            if (!isDuplicateError(guestInsertErr)) throw guestInsertErr

            for (const row of guestInserts) {
              const { error: rowErr } = await admin.from('guests').insert(row)
              if (rowErr) {
                if (isDuplicateError(rowErr)) {
                  guestSkipped++
                  continue
                }
                throw rowErr
              }
              guestImported++
            }
          } else {
            guestImported = insertedGuests?.length ?? 0
          }
        }

        let guestUpdated = 0
        const guestWithChanges = guestUpdates.filter(u => Object.keys(u.patch).length > 0)
        for (let i = 0; i < guestWithChanges.length; i += CHUNK) {
          const batch = guestWithChanges.slice(i, i + CHUNK)
          const results = await Promise.all(
            batch.map(u =>
              admin
                .from('guests')
                .update(u.patch)
                .eq('id', u.id)
                .eq('chapter_id', chapterId)
                .then(res => !res.error)
            )
          )
          guestUpdated += results.filter(Boolean).length
        }
        guestUpdated += guestUpdates.length - guestWithChanges.length

        return { imported: guestImported, updated: guestUpdated, skipped: guestSkipped }
      }

      const guestResult = await importGuestRows()

      if (imported > 0 || updated > 0 || guestResult.imported > 0 || guestResult.updated > 0) {
        await writeActivityLog(session, scope, {
          action: imported >= updated ? 'insert' : 'update',
          entity: guestResult.imported + guestResult.updated > imported + updated ? 'guest' : 'visitor',
          entityId: null,
          entityLabel: `import report ke ${meeting.title}: visitor +${imported}/${updated}, guest +${guestResult.imported}/${guestResult.updated}`,
          newData: { imported, updated, skipped, guests: guestResult, meetingId, updateExisting },
        })
      }

      return ok({
        imported,
        updated,
        skipped,
        total: visitors.length + guests.length,
        guests: guestResult,
      })
    },
    { requireChapter: true }
  )
}
