'use client'

import { ReactNode, useEffect, useState } from 'react'

export default function ChapterRouteScope({
  chapterId,
  children,
}: {
  chapterId: string
  children: ReactNode
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadChapterContext() {
      const existing = localStorage.getItem('selectedChapterContext')
      let existingContext: any = null

      try {
        existingContext = existing ? JSON.parse(existing) : null
      } catch {
        existingContext = null
      }

      try {
        const response = await fetch(`/api/chapter-context/${encodeURIComponent(chapterId)}`, { cache: 'no-store' })
        const context = await response.json()
        if (response.ok && context?.chapter?.id && !cancelled) {
          localStorage.setItem('selectedChapterContext', JSON.stringify(context))
          window.dispatchEvent(new Event('chapter-context-updated'))
          setReady(true)
          return
        }
      } catch {
        // Fall back to existing context below.
      }

      if (!cancelled) {
        if (existingContext?.chapter?.id !== chapterId) {
          localStorage.setItem('selectedChapterContext', JSON.stringify({
            chapter: {
              id: chapterId,
              name: existingContext?.chapter?.name || '',
              display_name: existingContext?.chapter?.display_name || '',
            },
            area: existingContext?.area || null,
            city: existingContext?.city || null,
          }))
          window.dispatchEvent(new Event('chapter-context-updated'))
        }
        setReady(true)
      }
    }

    loadChapterContext()

    return () => {
      cancelled = true
    }
  }, [chapterId])

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="h-8 w-8 animate-spin text-red-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return <>{children}</>
}
