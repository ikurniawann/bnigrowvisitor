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
    <header className="sticky top-0 z-30 h-[58px] border-b border-white/65 bg-white/62 shadow-sm backdrop-blur-2xl">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger for mobile - handled by Sidebar */}
          <h1 className="text-[17px] font-semibold text-gray-950 tracking-[-0.01em]">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Visitor Button */}
          <button
            onClick={onAddVisitor}
            className="inline-flex h-10 items-center gap-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">Tambah Visitor</span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200/70">
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-semibold text-gray-950 leading-4 tracking-[-0.01em]">{user?.name}</div>
              <div className="text-[11px] text-gray-500 capitalize leading-4">{user?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center text-sm font-bold shadow-md ring-2 ring-white/70">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-sm text-gray-600 hover:text-gray-950 hover:bg-white/60 rounded-xl transition-colors"
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
