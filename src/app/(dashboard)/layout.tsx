'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { getCurrentUser, signOut, User } from '@/lib/auth'

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
  '/kanban': 'kanban',
  '/visitors': 'visitors',
  '/ocr': 'ocr',
  '/pic': 'pic',
  '/weekly': 'weekly',
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [showAddVisitorModal, setShowAddVisitorModal] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      setLoading(false)
    }
    loadUser()
  }, [router])

  // Sync pathname with currentPage
  useEffect(() => {
    const page = pathToPage[pathname] || 'dashboard'
    setCurrentPage(page)
  }, [pathname])

  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleNavigate = (page: string) => {
    const paths: Record<string, string> = {
      dashboard: '/dashboard',
      kanban: '/kanban',
      visitors: '/visitors',
      ocr: '/ocr',
      pic: '/pic',
      weekly: '/weekly',
    }
    if (paths[page]) {
      router.push(paths[page])
    }
  }

  const handleAddVisitor = () => {
    // Navigate to visitors page and trigger modal
    router.push('/visitors')
    // Wait for navigation then dispatch event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-add-visitor'))
    }, 300)
  }

  // Check if current page should be fullscreen
  const isFullscreen = FULLSCREEN_PAGES.includes(pathname)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar - hidden on fullscreen pages */}
        {!isFullscreen && (
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        )}
        
        <div className={`flex-1 flex flex-col min-h-screen ${isFullscreen ? 'ml-0' : ''}`}>
          {/* Topbar - hidden on fullscreen pages */}
          {!isFullscreen && (
            <Topbar 
              title={currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
              user={user}
              onLogout={handleLogout}
              onAddVisitor={handleAddVisitor}
            />
          )}
          
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
