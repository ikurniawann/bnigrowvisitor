import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { writeActivityLogAs, SystemActor } from './activityLogService'

// Days a member may remain active past renewal_date before the daily job
// deactivates them. Gives Finance time to collect payment after the invoice.
export const RENEWAL_GRACE_DAYS = 14

// Default membership cycle when a renewal is confirmed without an explicit date.
export const DEFAULT_RENEWAL_CYCLE_MONTHS = 12

const FINANCE_ACTOR: SystemActor = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'system@bni-vh.com',
  role: 'system',
}

// Adds whole months to an ISO date (YYYY-MM-DD) and returns the same format.
function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface MemberRow {
  id: string
  name: string
  chapter_id: string | null
  status: string
  renewal_date: string | null
}

interface OverdueMemberRow {
  id: string
  name: string
  chapter_id: string | null
  renewal_date: string | null
}

export interface RenewalInput {
  // Explicit next renewal date wins. Otherwise the current renewal_date (or
  // today, whichever is later) is advanced by cycleMonths.
  renewedUntil?: string | null
  cycleMonths?: number | null
  actorEmail?: string | null
}

// Confirms a renewal (typically driven by BNI Finance's write-back): pushes the
// renewal_date forward and reactivates the member. Returns the updated row.
export async function recordRenewal(memberId: string, input: RenewalInput) {
  const admin = getSupabaseAdmin()
  const { data: existing, error: findError } = await admin
    .from('members')
    .select('id, name, chapter_id, status, renewal_date')
    .eq('id', memberId)
    .maybeSingle<MemberRow>()
  if (findError) throw findError
  if (!existing) return null

  let nextRenewal: string
  if (input.renewedUntil) {
    nextRenewal = input.renewedUntil
  } else {
    const cycle = input.cycleMonths && input.cycleMonths > 0
      ? input.cycleMonths
      : DEFAULT_RENEWAL_CYCLE_MONTHS
    // Anchor on the later of the existing renewal date or today so a late
    // payment doesn't shorten the new cycle.
    const today = todayIso()
    const anchor = existing.renewal_date && existing.renewal_date > today
      ? existing.renewal_date
      : today
    nextRenewal = addMonths(anchor, cycle)
  }

  const update = {
    renewal_date: nextRenewal,
    last_renewed_at: new Date().toISOString(),
    status: 'active',
  }

  const { data, error } = await admin
    .from('members')
    .update(update)
    .eq('id', memberId)
    .select()
    .single()
  if (error) throw error

  await writeActivityLogAs(
    { ...FINANCE_ACTOR, email: input.actorEmail || FINANCE_ACTOR.email },
    { organizationId: null, chapterId: existing.chapter_id },
    {
      action: 'update',
      entity: 'member',
      entityId: memberId,
      entityLabel: existing.name,
      oldData: { status: existing.status, renewal_date: existing.renewal_date },
      newData: update,
      metadata: { source: 'finance_renewal' },
    }
  )

  return data
}

export interface DeactivationResult {
  deactivated: number
  members: { id: string; name: string; renewal_date: string | null }[]
}

// Daily job: deactivate every active member whose renewal_date lapsed more than
// RENEWAL_GRACE_DAYS ago. Idempotent — re-running it changes nothing once a
// member is already inactive.
export async function deactivateOverdueMembers(): Promise<DeactivationResult> {
  const admin = getSupabaseAdmin()
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - RENEWAL_GRACE_DAYS)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('members')
    .update({ status: 'inactive' })
    .eq('status', 'active')
    .not('renewal_date', 'is', null)
    .lt('renewal_date', cutoffIso)
    .select('id, name, chapter_id, renewal_date')
  if (error) throw error

  const rows = (data || []) as OverdueMemberRow[]

  // One audit row per deactivated member so the chapter trail explains the
  // status flip.
  await Promise.all(
    rows.map(row =>
      writeActivityLogAs(
        FINANCE_ACTOR,
        { organizationId: null, chapterId: row.chapter_id },
        {
          action: 'update',
          entity: 'member',
          entityId: row.id,
          entityLabel: row.name,
          newData: { status: 'inactive' },
          metadata: { source: 'renewal_deactivation_job', renewal_date: row.renewal_date, cutoff: cutoffIso },
        }
      )
    )
  )

  return {
    deactivated: rows.length,
    members: rows.map(r => ({ id: r.id, name: r.name, renewal_date: r.renewal_date })),
  }
}
