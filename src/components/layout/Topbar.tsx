'use client'

import { useEffect, useRef, useState } from 'react'
import { User } from '@/lib/supabase'
import { getUserLevelLabel, isNationalAdmin } from '@/lib/permissions'
import { ChapterBranding, getChapterBranding } from '@/lib/chapterBranding'

interface TopbarProps {
  title: string
  user: User | null
  onLogout: () => void
  onAddVisitor: () => void
  showAddVisitor?: boolean
}

export default function Topbar({ title, user, onLogout, onAddVisitor, showAddVisitor = true }: TopbarProps) {
  const [branding, setBranding] = useState<ChapterBranding>(() => ({
    chapterName: 'BNI',
    displayName: 'BNI Chapter',
    shortName: 'BNI',
    locationLabel: '',
  }))
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const levelLabel = getUserLevelLabel(user)
  const isChapterRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/chapter/')
  const profileName = isNationalAdmin(user) && isChapterRoute
    ? `Admin ${branding.chapterName}`
    : user?.name
  const scopeLabel = isNationalAdmin(user) && isChapterRoute
    ? [branding.locationLabel, branding.displayName].filter(Boolean).join(' / ')
    : isNationalAdmin(user)
      ? (user?.organization_name || 'BNI Indonesia')
      : [user?.city_name, user?.area_name, user?.chapter_display_name || user?.chapter_name]
        .filter(Boolean)
        .join(' / ')

  useEffect(() => {
    let cancelled = false

    async function loadBranding() {
      const routeMatch = window.location.pathname.match(/^\/chapter\/([^/]+)/)
      if (routeMatch?.[1]) {
        const chapterId = decodeURIComponent(routeMatch[1])
        try {
          const response = await fetch(`/api/chapter-context/${encodeURIComponent(chapterId)}`, { cache: 'no-store' })
          const context = await response.json()
          if (response.ok && context?.chapter?.id) {
            localStorage.setItem('selectedChapterContext', JSON.stringify(context))
          }
        } catch {
          // Keep existing local context if refresh fails.
        }
      }

      if (!cancelled) setBranding(getChapterBranding())
    }

    loadBranding()

    return () => {
      cancelled = true
    }
  }, [])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  return (
    <header className="sticky top-0 z-30 h-[58px] border-b border-white/65 bg-white/62 shadow-sm backdrop-blur-2xl">
      <div className="relative h-full px-4 lg:px-6 flex items-center">

        {/* Desktop: title left-aligned */}
        <h1 className="hidden lg:block flex-1 text-[17px] font-semibold text-gray-950 tracking-[-0.01em]">{title}</h1>

        {/* Mobile: title centered (absolute, between burger and avatar) */}
        <h1 className="lg:hidden absolute inset-x-0 text-center px-24 text-[15px] font-semibold text-gray-950 tracking-[-0.01em] truncate pointer-events-none">{title}</h1>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">

          {/* Add Visitor Button */}
          {showAddVisitor && (
            <button
              onClick={onAddVisitor}
              className="inline-flex h-9 items-center gap-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Tambah Visitor</span>
            </button>
          )}

          {/* Profile avatar + dropdown (logout lives here) */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 pl-2 lg:pl-3 lg:border-l lg:border-gray-200/70"
            >
              {/* Name + scope: desktop only */}
              <div className="text-right hidden lg:block">
                <div className="text-[13px] font-semibold text-gray-950 leading-4 tracking-[-0.01em]">{profileName}</div>
                <div className="text-[11px] text-gray-500 leading-4">{levelLabel}</div>
                {scopeLabel && (
                  <div className="max-w-[200px] truncate text-[10px] text-gray-400 leading-4">{scopeLabel}</div>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center text-sm font-bold shadow-md ring-2 ring-white/70 flex-shrink-0">
                {profileName?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {/* Profile dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-[13px] font-semibold text-gray-950 leading-5">{profileName}</div>
                  <div className="text-[11px] text-gray-500 leading-4 mt-0.5">{levelLabel}</div>
                  {scopeLabel && (
                    <div className="text-[11px] text-gray-400 leading-4 mt-0.5 truncate">{scopeLabel}</div>
                  )}
                </div>
                    {/* Profile link */}
                <a
                  href="/my-account"
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Ubah Password
                </a>
                {/* Logout */}
                <button
                  onClick={() => { setProfileOpen(false); onLogout() }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
