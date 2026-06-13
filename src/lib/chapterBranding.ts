export type ChapterBranding = {
  chapterId?: string
  chapterName: string
  displayName: string
  shortName: string
  locationLabel: string
}

function shortChapterName(name: string) {
  return name.replace(/^BNI\s+/i, '').replace(/\s+Chapter$/i, '').trim() || name
}

export function getChapterBranding() {
  if (typeof window === 'undefined') {
    return {
      chapterName: 'BNI Grow',
      displayName: 'BNI Grow Chapter',
      shortName: 'Grow',
      locationLabel: '',
    } satisfies ChapterBranding
  }

  try {
    const selected = localStorage.getItem('selectedChapterContext')
    const selectedContext = selected ? JSON.parse(selected) : null
    const tenant = localStorage.getItem('tenantContext')
    const tenantContext = tenant ? JSON.parse(tenant) : null
    const context = selectedContext?.chapter?.id ? selectedContext : tenantContext

    const chapterName = context?.chapter?.name || context?.chapter?.display_name || 'BNI Grow'
    const displayName = context?.chapter?.display_name || `${chapterName} Chapter`
    const locationLabel = [context?.city?.name, context?.area?.name].filter(Boolean).join(' / ')

    return {
      chapterId: context?.chapter?.id,
      chapterName,
      displayName,
      shortName: shortChapterName(chapterName),
      locationLabel,
    } satisfies ChapterBranding
  } catch {
    return {
      chapterName: 'BNI Grow',
      displayName: 'BNI Grow Chapter',
      shortName: 'Grow',
      locationLabel: '',
    } satisfies ChapterBranding
  }
}
