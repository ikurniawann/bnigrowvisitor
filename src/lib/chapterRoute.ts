import { User } from './supabase'

export function getActiveChapterId(user?: Pick<User, 'chapter_id'> | null) {
  if (typeof window === 'undefined') return user?.chapter_id || ''

  const routeMatch = window.location.pathname.match(/^\/chapter\/([^/]+)/)
  if (routeMatch?.[1]) return decodeURIComponent(routeMatch[1])

  try {
    const selected = localStorage.getItem('selectedChapterContext')
    const selectedContext = selected ? JSON.parse(selected) : null
    if (selectedContext?.chapter?.id) return selectedContext.chapter.id

    const tenant = localStorage.getItem('tenantContext')
    const tenantContext = tenant ? JSON.parse(tenant) : null
    if (tenantContext?.chapter?.id) return tenantContext.chapter.id
  } catch {
    // Ignore malformed localStorage and fall through to user scope.
  }

  return user?.chapter_id || ''
}

export function getChapterRoute(section = 'dashboard', user?: Pick<User, 'chapter_id'> | null) {
  const chapterId = getActiveChapterId(user)
  return chapterId ? `/chapter/${encodeURIComponent(chapterId)}/${section}` : '/chapter-dashboard'
}
