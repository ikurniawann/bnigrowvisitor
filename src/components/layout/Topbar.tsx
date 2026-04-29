'use client'

import { User } from '@/lib/supabase'

interface TopbarProps {
  title: string
  user: User | null
  onLogout: () => void
  onAddVisitor: () => void
}

export default function Topbar({ title, user, onLogout, onAddVisitor }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm h-14">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger for mobile - handled by Sidebar */}
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Visitor Button */}
          <button
            onClick={onAddVisitor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">Tambah Visitor</span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{user?.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
