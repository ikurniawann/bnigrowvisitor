import { getActiveChapterId } from './chapterRoute'

// Thin client for the scoped data API. Every request carries the active chapter
// as `?chapterId=`; the server only honours it for national admins (chapter
// users are pinned to their own chapter), so sending it always is safe.
function buildUrl(path: string): string {
  const chapterId = getActiveChapterId()
  const base = `/api/data/${path}`
  if (!chapterId) return base
  const separator = path.includes('?') ? '&' : '?'
  return `${base}${separator}chapterId=${encodeURIComponent(chapterId)}`
}

async function parse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json?.error || fallbackMessage)
  }
  return json?.data as T
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), { credentials: 'same-origin' })
  return parse<T>(response, 'Gagal memuat data.')
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return parse<T>(response, 'Gagal menyimpan data.')
}
