'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  currentPage: string
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z' },
  { id: 'kanban', label: 'Pipeline', path: '/kanban', icon: 'M3 3h5v18H3V3zm7 0h5v12h-5V3zm7 0h5v15h-5V3z' },
  { id: 'visitors', label: 'Visitor', path: '/visitors', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 1 1 0 7.75' },
  { id: 'attended', label: 'MCQA', path: '/attended', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'members', label: 'Member Grow', path: '/members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'export-import', label: 'Export / Import', path: '/export-import', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m0 0l5-5m0 5l-5-5m5 5V3' },
  { id: 'text-format', label: 'Text Format', path: '/text-format', icon: 'M4 6h16M4 12h10M4 18h16' },
  { id: 'pic', label: 'Kelola PIC', path: '/pic', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6c-4.4 0-8 3.6-8 8h16c0-4.4-3.6-8-8-8z' },
  { id: 'weekly', label: 'Weekly Meeting', path: '/weekly', icon: 'M3 4h18v18H3V4zm13-2v4M8 2v4M3 10h18' },
]

export default function Sidebar({ currentPage }: SidebarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavigate = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 flex h-dvh w-64 flex-col glass-panel-strong border-r border-white/70
        transform transition-transform duration-200 z-50
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/60">
          <div className="inline-flex bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full mb-2 tracking-wide shadow-sm">
            BNI GROW
          </div>
          <div className="text-[17px] font-semibold text-gray-950 leading-tight tracking-[-0.01em]">Visitor Manager</div>
          <div className="text-xs text-gray-500 mt-1">Follow Up Specialist</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Menu Section */}
          <div className="mb-5">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-2 mb-1">
              MENU
            </div>
            {navItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1
                  text-[13px] font-medium transition-all duration-150
                  ${currentPage === item.id 
                    ? 'bg-white/80 text-red-600 shadow-sm ring-1 ring-red-100/80' 
                    : 'text-gray-700 hover:bg-white/55 hover:text-gray-950'
                  }
                `}
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Data Section */}
          <div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-2 mb-1">
              DATA
            </div>
            {navItems.slice(5).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1
                  text-[13px] font-medium transition-all duration-150
                  ${currentPage === item.id 
                    ? 'bg-white/80 text-red-600 shadow-sm ring-1 ring-red-100/80' 
                    : 'text-gray-700 hover:bg-white/55 hover:text-gray-950'
                  }
                `}
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/60 px-5 py-4">
          <a
            href="https://wit.id"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-white/60 hover:text-red-600"
          >
            <span>
              Created by <span className="font-semibold text-gray-700 group-hover:text-red-600">WIT.ID</span>
            </span>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <button 
        className="lg:hidden p-2 fixed top-3 left-3 z-50 bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/70"
        onClick={() => setIsOpen(true)}
      >
        <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
    </>
  )
}
