'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getChapterRoute } from '@/lib/chapterRoute'

const TABS = [
  {
    id: 'chapter-dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M4 5h16v14H4V5zm4 4h3v6H8V9zm5 2h3v4h-3v-4z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm4 3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H8zm5 2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-3z" />
      </svg>
    ),
    path: 'dashboard',
    fallbackPath: '/chapter-dashboard',
  },
  {
    id: 'visitors',
    label: 'Visitor',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M9 7a4 4 0 1 1 0 8A4 4 0 0 1 9 7zm8 1a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM1 19c0-3.314 3.134-6 7-6h2c3.866 0 7 2.686 7 6v2H1v-2zm15 2v-2c0-1.2-.4-2.3-1.1-3.2A5.01 5.01 0 0 1 22 19v2h-6z" />
      </svg>
    ),
    path: 'visitors',
    fallbackPath: '/visitors',
  },
  {
    id: 'guests',
    label: 'Guest',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 18a7 7 0 0 1 14 0M19 8h3M20.5 6.5v3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM5 21a7 7 0 0 1 14 0H5z" />
        <path d="M19 8h4v2h-4V8z" />
        <path d="M20 6h2v6h-2V6z" />
      </svg>
    ),
    path: 'guests',
    fallbackPath: '/guests',
  },
  {
    id: 'kanban',
    label: 'Pipeline',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M3 3h5v18H3V3zm7 0h5v12h-5V3zm7 0h5v15h-5V3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="12" rx="1" />
        <rect x="17" y="3" width="5" height="15" rx="1" />
      </svg>
    ),
    path: 'pipeline',
    fallbackPath: '/kanban',
  },
  {
    id: 'attended',
    label: 'MCQA',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12zm13.707-1.293a1 1 0 0 0-1.414-1.414L11 12.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    path: 'mcqa',
    fallbackPath: '/attended',
  },
  {
    id: 'wa-blast',
    label: 'WA Blast',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconFilled: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M5 3a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5z" />
      </svg>
    ),
    path: 'wa-blast',
    fallbackPath: '/wa-blast',
  },
]

interface MobileTabBarProps {
  currentPage: string
}

export default function MobileTabBar({ currentPage }: MobileTabBarProps) {
  const router = useRouter()
  const [chapterId, setChapterId] = useState('')

  useEffect(() => {
    const routeMatch = window.location.pathname.match(/^\/chapter\/([^/]+)/)
    if (routeMatch?.[1]) {
      setChapterId(decodeURIComponent(routeMatch[1]))
      return
    }
    try {
      const stored = localStorage.getItem('selectedChapterContext')
      const ctx = stored ? JSON.parse(stored) : null
      setChapterId(ctx?.chapter?.id || '')
    } catch {
      setChapterId('')
    }
  }, [])

  const resolvePath = (tab: typeof TABS[0]) => {
    if (chapterId) return `/chapter/${encodeURIComponent(chapterId)}/${tab.path}`
    return tab.fallbackPath
  }

  // Hide on fullscreen pages (Kanban has its own layout)
  if (currentPage === 'kanban') return null

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-white/60 bg-white/90"
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(tab => {
        const isActive = currentPage === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => router.push(resolvePath(tab))}
            className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 transition-[color] duration-150 active:scale-95 ${
              isActive ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
              {isActive ? tab.iconFilled : tab.icon}
            </span>
            <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
