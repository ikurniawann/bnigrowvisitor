import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { SessionPayload } from './session'

// Roles that may operate across chapters. Everyone else is pinned to their own
// chapter from the (server-verified) session, never from client input.
const NATIONAL_ROLES = new Set(['national_admin', 'admin'])

export function isNationalRole(role: string | undefined | null): boolean {
  return !!role && NATIONAL_ROLES.has(role)
}

export interface ChapterScope {
  isNational: boolean
  // null = every chapter (national admin, no chapter selected). A concrete id
  // means "restrict to this chapter only".
  chapterId: string | null
  organizationId: string | null
}

export class ScopeError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.name = 'ScopeError'
    this.status = status
  }
}

async function chapterExists(chapterId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('chapters')
    .select('id')
    .eq('id', chapterId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

// Single source of truth for "which chapter(s) may this session touch".
//
// - national_admin / admin: may target one chapter (validated) via
//   requestedChapterId, or all chapters when none is given.
// - chapter_admin / pic / member: ALWAYS forced to session.chapter_id;
//   requestedChapterId is ignored. A chapter-bound account with no chapter is
//   rejected (it must never see global data).
export async function resolveChapterScope(
  session: SessionPayload,
  requestedChapterId?: string | null
): Promise<ChapterScope> {
  const organizationId = session.organization_id ?? null

  if (isNationalRole(session.role)) {
    const requested = (requestedChapterId || '').trim()
    if (!requested) {
      return { isNational: true, chapterId: null, organizationId }
    }
    if (!(await chapterExists(requested))) {
      throw new ScopeError('Chapter tidak ditemukan.', 404)
    }
    return { isNational: true, chapterId: requested, organizationId }
  }

  const own = (session.chapter_id || '').trim()
  if (!own) {
    throw new ScopeError('Akun tidak terikat pada chapter mana pun.', 403)
  }
  return { isNational: false, chapterId: own, organizationId }
}

// Append a chapter filter to a PostgREST query builder when the scope is
// chapter-bound. A national/all scope (chapterId null) leaves the query open.
export function applyScope<T>(query: T, scope: ChapterScope): T {
  if (scope.chapterId) {
    return (query as { eq: (col: string, val: string) => T }).eq('chapter_id', scope.chapterId)
  }
  return query
}
