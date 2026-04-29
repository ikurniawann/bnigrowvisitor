'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  currentPage: string
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z' },
  { id: 'kanban', label: 'Kanban', path: '/kanban', icon: 'M3 3h5v18H3V3zm7 0h5v12h-5V3zm7 0h5v15h-5V3z' },
  { id: 'visitors', label: 'Visitor', path: '/visitors', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 1 1 0 7.75' },
  { id: 'attended', label: 'Visitor Hadir', path: '/attended', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
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
        fixed top-0 left-0 h-full w-64 bg-gray-50 border-r border-gray-200 
        transform transition-transform duration-200 z-50
        lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100 bg-white">
          <div className="inline-block bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded mb-2 tracking-wide">
            BNI GROW
          </div>
          <div className="text-base font-bold text-gray-900 leading-tight">Visitor Manager</div>
          <div className="text-xs text-gray-500 mt-0.5">Follow Up Specialist</div>
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
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5
                  text-[13px] font-medium transition-all duration-150
                  ${currentPage === item.id 
                    ? 'bg-red-50 text-red-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5
                  text-[13px] font-medium transition-all duration-150
                  ${currentPage === item.id 
                    ? 'bg-red-50 text-red-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
      </aside>

      {/* Mobile hamburger button */}
      <button 
        className="lg:hidden p-2 fixed top-3 left-3 z-50 bg-white rounded-lg shadow-md"
        onClick={() => setIsOpen(true)}
      >
        <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
    </>
  )
}
