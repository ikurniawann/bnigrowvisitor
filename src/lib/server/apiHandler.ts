import 'server-only'
import { NextResponse } from 'next/server'
import { getSession, SessionPayload } from './session'
import { resolveChapterScope, ChapterScope, ScopeError } from './chapterScope'

export interface ScopedContext {
  session: SessionPayload
  scope: ChapterScope
}

interface HandlerOptions {
  // Writes need a concrete chapter. A national admin must select one first.
  requireChapter?: boolean
}

// Wraps a data API route with the standard guard rails: a valid session is
// mandatory, chapter scope is resolved server-side from the session (the
// `chapterId` query param is only honoured for national admins), and errors are
// turned into clean JSON envelopes. The handler never sees an unauthenticated
// request or an unresolved scope.
export async function withScopedSession(
  request: Request,
  handler: (ctx: ScopedContext) => Promise<NextResponse>,
  options: HandlerOptions = {}
): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })
  }

  try {
    const requestedChapterId = new URL(request.url).searchParams.get('chapterId')
    const scope = await resolveChapterScope(session, requestedChapterId)

    if (options.requireChapter && !scope.chapterId) {
      return NextResponse.json(
        { error: 'Pilih chapter terlebih dahulu sebelum menyimpan data.' },
        { status: 400 }
      )
    }

    return await handler({ session, scope })
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Data API error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

// Reads and JSON-parses a request body, tolerating an empty body.
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    return {} as T
  }
}
