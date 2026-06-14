export type ChapterBranding = {
  chapterId?: string
  chapterName: string
  displayName: string
  shortName: string
  locationLabel: string
}

// Chapter-neutral default so a tenant whose context hasn't loaded yet never
// flashes another chapter's name.
const DEFAULT_BRANDING: ChapterBranding = {
  chapterName: 'BNI',
  displayName: 'BNI Chapter',
  shortName: 'BNI',
  locationLabel: '',
}

function shortChapterName(name: string) {
  return name.replace(/^BNI\s+/i, '').replace(/\s+Chapter$/i, '').trim() || name
}

export function getChapterBranding() {
  if (typeof window === 'undefined') {
    return DEFAULT_BRANDING
  }

  try {
    const selected = localStorage.getItem('selectedChapterContext')
    const selectedContext = selected ? JSON.parse(selected) : null
    const tenant = localStorage.getItem('tenantContext')
    const tenantContext = tenant ? JSON.parse(tenant) : null
    const context = selectedContext?.chapter?.id ? selectedContext : tenantContext

    const chapterName = context?.chapter?.name || context?.chapter?.display_name || DEFAULT_BRANDING.chapterName
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
    return DEFAULT_BRANDING
  }
}
