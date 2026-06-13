import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import type { ChapterTarget } from '@/lib/national/types'

const TARGET_COLUMNS =
  'id, chapter_id, visitors_per_meeting, member_conversion_pct, min_active_pic, min_weekly_meetings_per_month'

export interface ResolvedTargets {
  default: Partial<ChapterTarget> | null
  overrides: Map<string, Partial<ChapterTarget>>
}

function pickTarget(row: any): Partial<ChapterTarget> {
  return {
    visitors_per_meeting: row.visitors_per_meeting,
    member_conversion_pct: row.member_conversion_pct,
    min_active_pic: row.min_active_pic,
    min_weekly_meetings_per_month: row.min_weekly_meetings_per_month,
  }
}

// Loads national default + per-chapter overrides. Tolerant of the table not
// existing yet (pre-migration) — returns empty so callers fall back to defaults.
export async function loadTargets(): Promise<ResolvedTargets> {
  const { data, error } = await getSupabaseAdmin().from('chapter_targets').select(TARGET_COLUMNS)
  if (error) {
    if (error.code !== '42P01') console.error('loadTargets error:', error.message)
    return { default: null, overrides: new Map() }
  }

  const overrides = new Map<string, Partial<ChapterTarget>>()
  let defaultTarget: Partial<ChapterTarget> | null = null
  for (const row of data || []) {
    if (row.chapter_id) overrides.set(row.chapter_id, pickTarget(row))
    else defaultTarget = pickTarget(row)
  }
  return { default: defaultTarget, overrides }
}

// Returns the raw rows for the targets editor (default + overrides list).
export async function listTargets() {
  const { data, error } = await getSupabaseAdmin()
    .from('chapter_targets')
    .select(TARGET_COLUMNS)
    .order('chapter_id', { nullsFirst: true })
  if (error) throw error
  return data || []
}

export interface TargetUpsert extends ChapterTarget {
  chapterId: string | null
  organizationId?: string | null
}

export async function upsertTarget(input: TargetUpsert) {
  const admin = getSupabaseAdmin()
  const values = {
    visitors_per_meeting: input.visitors_per_meeting,
    member_conversion_pct: input.member_conversion_pct,
    min_active_pic: input.min_active_pic,
    min_weekly_meetings_per_month: input.min_weekly_meetings_per_month,
    updated_at: new Date().toISOString(),
  }

  // The national default (chapter_id IS NULL) can't use ON CONFLICT (NULLs are
  // distinct), so update-then-insert it by hand. Per-chapter rows upsert cleanly.
  if (input.chapterId === null) {
    const { data: existing, error: findError } = await admin
      .from('chapter_targets')
      .select('id')
      .is('chapter_id', null)
      .maybeSingle()
    if (findError) throw findError

    if (existing) {
      const { error } = await admin.from('chapter_targets').update(values).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await admin
        .from('chapter_targets')
        .insert({ ...values, chapter_id: null, organization_id: input.organizationId ?? null })
      if (error) throw error
    }
    return
  }

  const { error } = await admin
    .from('chapter_targets')
    .upsert(
      { ...values, chapter_id: input.chapterId, organization_id: input.organizationId ?? null },
      { onConflict: 'chapter_id' }
    )
  if (error) throw error
}

export async function deleteTargetOverride(chapterId: string) {
  const { error } = await getSupabaseAdmin().from('chapter_targets').delete().eq('chapter_id', chapterId)
  if (error) throw error
}
