'use client'

import { useEffect, useState } from 'react'
import { ChapterBranding, getChapterBranding } from '@/lib/chapterBranding'

export function useChapterBranding() {
  const [branding, setBranding] = useState<ChapterBranding>(() => getChapterBranding())

  useEffect(() => {
    let cancelled = false

    async function syncBranding() {
      const routeMatch = window.location.pathname.match(/^\/chapter\/([^/]+)/)

      if (routeMatch?.[1]) {
        try {
          const chapterId = decodeURIComponent(routeMatch[1])
          const response = await fetch(`/api/chapter-context/${encodeURIComponent(chapterId)}`, { cache: 'no-store' })
          const context = await response.json()
          if (response.ok && context?.chapter?.id) {
            localStorage.setItem('selectedChapterContext', JSON.stringify(context))
          }
        } catch {
          // Keep the last known chapter context if the refresh fails.
        }
      }

      if (!cancelled) setBranding(getChapterBranding())
    }

    function handleContextUpdated() {
      setBranding(getChapterBranding())
    }

    syncBranding()
    window.addEventListener('chapter-context-updated', handleContextUpdated)
    window.addEventListener('storage', handleContextUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('chapter-context-updated', handleContextUpdated)
      window.removeEventListener('storage', handleContextUpdated)
    }
  }, [])

  return branding
}
