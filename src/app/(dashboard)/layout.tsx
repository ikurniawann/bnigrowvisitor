'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import GrowAssistant from '@/components/assistant/GrowAssistant'
import { getCurrentUser, signOut } from '@/lib/auth'
import { isNationalAdmin } from '@/lib/permissions'
import { getChapterRoute } from '@/lib/chapterRoute'

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
  '/national-dashboard': 'national-dashboard',
  '/chapter-dashboard': 'chapter-dashboard',
  '/kanban': 'kanban',
  '/visitors': 'visitors',
  '/attended': 'attended',
  '/members': 'members',
  '/master': 'master',
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
  'national-dashboard': 'Manage Chapter',
  'chapter-dashboard': 'Chapter Dashboard',
  kanban: 'Pipeline',
  visitors: 'Visitors',
  attended: 'MCQA',
  members: 'Member Grow',
  master: 'Master Wilayah',
  'export-import': 'Export / Import',
  'text-format': 'Text Format',
  pic: 'Kelola PIC',
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
      'export-import': 'export-import',
      'text-format': 'text-format',
      pic: 'pic',
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
  const isNationalArea = ['national-overview', 'national-governance', 'national-dashboard', 'master'].includes(currentPage)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-red-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
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
          
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
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
    </DashboardContext.Provider>
  )
}
