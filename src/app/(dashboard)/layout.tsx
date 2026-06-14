'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import dynamic from 'next/dynamic'
import { getCurrentUser, signOut } from '@/lib/auth'
import { isNationalAdmin } from '@/lib/permissions'
import { getChapterRoute } from '@/lib/chapterRoute'

const GrowAssistant = dynamic(() => import('@/components/assistant/GrowAssistant'), { ssr: false, loading: () => null })
const MobileTabBar = dynamic(() => import('@/components/layout/MobileTabBar'), { ssr: false, loading: () => null })

// Context for global actions
interface DashboardContextType {
  onAddVisitor: () => void
}

export const DashboardContext = React.createContext<DashboardContextType>({
  onAddVisitor: () => {},
})

// Map pathname to page id
const pathToPage: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/national-overview': 'national-overview',
  '/national-governance': 'national-governance',
  '/national-policies': 'national-policies',
  '/national-dashboard': 'national-dashboard',
  '/chapter-dashboard': 'chapter-dashboard',
  '/kanban': 'kanban',
  '/visitors': 'visitors',
  '/attended': 'attended',
  '/members': 'members',
  '/master': 'master',
  '/my-account': 'my-account',
  '/wa-blast': 'wa-blast',
  '/export-import': 'export-import',
  '/text-format': 'text-format',
  '/ocr': 'ocr',
  '/pic': 'pic',
  '/weekly': 'weekly',
  '/logs': 'logs',
}

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  'national-overview': 'Dashboard Nasional',
  'national-governance': 'Governance & Audit',
  'national-policies': 'Template & Policy',
  'national-dashboard': 'Manage Chapter',
  'chapter-dashboard': 'Chapter Dashboard',
  kanban: 'Pipeline',
  visitors: 'Visitors',
  attended: 'MCQA',
  members: 'Member Grow',
  master: 'Master Wilayah',
  'my-account': 'Profil Akun',
  'wa-blast': 'WA Blast',
  'export-import': 'Export / Import',
  'text-format': 'Text Format',
  pic: 'Kelola PIC',
  'pic-accounts': 'Akun PIC',
  weekly: 'Weekly Meeting',
  logs: 'Log',
}

function getPageFromPath(pathname: string) {
  const chapterMatch = pathname.match(/^\/chapter\/[^/]+\/([^/]+)/)
  if (chapterMatch?.[1]) {
    const section = chapterMatch[1]
    const sectionMap: Record<string, string> = {
      dashboard: 'chapter-dashboard',
      pipeline: 'kanban',
      visitors: 'visitors',
      mcqa: 'attended',
      members: 'members',
      'wa-blast': 'wa-blast',
      'export-import': 'export-import',
      'text-format': 'text-format',
      pic: 'pic',
      'pic-accounts': 'pic-accounts',
      weekly: 'weekly',
      logs: 'logs',
    }
    return sectionMap[section] || 'chapter-dashboard'
  }

  return pathToPage[pathname] || 'dashboard'
}

// Pages that should hide sidebar (fullscreen mode)
const FULLSCREEN_PAGES = ['/kanban']

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any | null>(null)
  const [tenantWarning, setTenantWarning] = useState('')
  const [loading, setLoading] = useState(true)
  const currentPage = getPageFromPath(pathname)

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!isMounted) return

        if (!currentUser) {
          setLoading(false)
          router.push('/login')
          return
        }

        setUser(currentUser)
        localStorage.setItem('user', JSON.stringify(currentUser))

        try {
          const response = await fetch('/api/tenant-context', { cache: 'no-store' })
          const tenantContext = await response.json()
          localStorage.setItem('tenantContext', JSON.stringify(tenantContext))

          if (
            tenantContext?.matched &&
            tenantContext?.chapter?.id &&
            currentUser.chapter_id &&
            tenantContext.chapter.id !== currentUser.chapter_id &&
            !isNationalAdmin(currentUser)
          ) {
            setTenantWarning(`Domain ini untuk ${tenantContext.chapter.display_name}, sedangkan akun kamu terdaftar di chapter berbeda.`)
          } else {
            setTenantWarning('')
          }
        } catch {
          localStorage.removeItem('tenantContext')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleAddVisitor = () => {
    // Navigate to visitors page and trigger modal
    router.push(getChapterRoute('visitors', user))
    // Wait for navigation then dispatch event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-add-visitor'))
    }, 300)
  }

  // Check if current page should be fullscreen
  const isFullscreen = FULLSCREEN_PAGES.includes(pathname) || currentPage === 'kanban'
  const isNationalArea = ['national-overview', 'national-governance', 'national-policies', 'national-dashboard', 'master'].includes(currentPage)
  const isChapterRoute = pathname.startsWith('/chapter/')

  if (loading) {
    return (
      <div className="flex min-h-screen fade-in-up">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex flex-col w-64 glass-panel-strong border-r border-white/70 h-screen">
          <div className="px-5 py-5 border-b border-white/60 space-y-2">
            <div className="h-4 w-20 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-36 rounded-lg bg-gray-200 animate-pulse mt-2" />
            <div className="h-3 w-28 rounded bg-gray-100 animate-pulse mt-1" />
          </div>
          <div className="flex-1 px-3 py-4 space-y-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 rounded-xl bg-gray-100/80 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
            ))}
          </div>
        </div>
        {/* Main area skeleton */}
        <div className="flex-1 flex flex-col lg:ml-0">
          <div className="h-14 border-b border-white/60 bg-white/50 px-6 flex items-center gap-3">
            <div className="h-5 w-36 rounded-lg bg-gray-200 animate-pulse" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-24 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 p-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-white/80 border border-white/70 animate-pulse" style={{ opacity: 1 - i * 0.08 }} />
              ))}
            </div>
            <div className="h-48 rounded-2xl bg-white/80 border border-white/70 animate-pulse" />
            <div className="h-32 rounded-2xl bg-white/80 border border-white/70 animate-pulse opacity-70" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardContext.Provider value={{ onAddVisitor: handleAddVisitor }}>
      <div className="flex min-h-screen">
        {/* Sidebar - hidden on fullscreen pages */}
        {!isFullscreen && (
          <Sidebar currentPage={currentPage} />
        )}
        
        <div className={`flex-1 flex flex-col min-h-screen min-w-0 ${isFullscreen ? 'ml-0' : 'lg:ml-64 lg:w-[calc(100%-16rem)]'}`}>
          {/* Topbar - hidden on fullscreen pages */}
          {!isFullscreen && (
            <Topbar 
              title={pageTitles[currentPage] || currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
              user={user}
              onLogout={handleLogout}
              onAddVisitor={handleAddVisitor}
              showAddVisitor={!isNationalArea}
            />
          )}
          
          {/* pb-16 gives room for the MobileTabBar on small screens */}
          <main key={pathname} className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6 overflow-auto fade-in-up">
            {tenantWarning && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {tenantWarning}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
      <GrowAssistant />
      {!isFullscreen && !isNationalArea && !isChapterRoute && currentPage !== 'chapter-dashboard' && <MobileTabBar currentPage={currentPage} />}
    </DashboardContext.Provider>
  )
}
