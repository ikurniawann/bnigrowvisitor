'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/lib/supabase'
import { isNationalAdmin } from '@/lib/permissions'
import { ChapterBranding, getChapterBranding } from '@/lib/chapterBranding'

interface SidebarProps {
  currentPage: string
}

const NATIONAL_OVERVIEW_ITEM = {
  id: 'national-overview',
  label: 'Dashboard Nasional',
  path: '/national-overview',
  icon: 'M3 13h2l2 6 4-14 3 9 2-4h3',
}

const NATIONAL_GOVERNANCE_ITEM = {
  id: 'national-governance',
  label: 'Governance & Audit',
  path: '/national-governance',
  icon: 'M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z',
}

const NATIONAL_POLICY_ITEM = {
  id: 'national-policies',
  label: 'Template & Policy',
  path: '/national-policies',
  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z',
}

const PIC_ACCOUNTS_ITEM = {
  id: 'pic-accounts',
  label: 'Akun PIC',
  path: 'pic-accounts',
  fallbackPath: '/pic',
  icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
}

const navItems = [
  { id: 'national-dashboard', label: 'Manage Chapter', path: '/national-dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z' },
  { id: 'master', label: 'Master Wilayah', path: '/master', icon: 'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M12 16v4' },
  { id: 'chapter-dashboard', label: 'Chapter Dashboard', path: 'dashboard', fallbackPath: '/chapter-dashboard', icon: 'M4 5h16v14H4V5zm4 4h3v6H8V9zm5 2h3v4h-3v-4z' },
  { id: 'kanban', label: 'Pipeline', path: 'pipeline', fallbackPath: '/kanban', icon: 'M3 3h5v18H3V3zm7 0h5v12h-5V3zm7 0h5v15h-5V3z' },
  { id: 'visitors', label: 'Visitor', path: 'visitors', fallbackPath: '/visitors', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 1 1 0 7.75' },
  { id: 'attended', label: 'MCQA', path: 'mcqa', fallbackPath: '/attended', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'members', label: 'Member Grow', path: 'members', fallbackPath: '/members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'export-import', label: 'Export / Import', path: 'export-import', fallbackPath: '/export-import', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m0 0l5-5m0 5l-5-5m5 5V3' },
  { id: 'text-format', label: 'Text Format', path: 'text-format', fallbackPath: '/text-format', icon: 'M4 6h16M4 12h10M4 18h16' },
  { id: 'pic', label: 'Kelola PIC', path: 'pic', fallbackPath: '/pic', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6c-4.4 0-8 3.6-8 8h16c0-4.4-3.6-8-8-8z' },
  { id: 'weekly', label: 'Weekly Meeting', path: 'weekly', fallbackPath: '/weekly', icon: 'M3 4h18v18H3V4zm13-2v4M8 2v4M3 10h18' },
  { id: 'logs', label: 'Log', path: 'logs', fallbackPath: '/logs', icon: 'M9 11H5a2 2 0 0 0-2 2v6h6v-8zm6-6h-4a2 2 0 0 0-2 2v12h6V5zm6 4h-4a2 2 0 0 0-2 2v8h6V9z' },
]

export default function Sidebar({ currentPage }: SidebarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeChapterId, setActiveChapterId] = useState('')
  const [branding, setBranding] = useState<ChapterBranding>(() => ({
    chapterName: 'BNI',
    displayName: 'BNI Chapter',
    shortName: 'BNI',
    locationLabel: '',
  }))

  // PIC self-service password panel
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const isSuperAdmin = isNationalAdmin(currentUser)
  const isNationalArea = isSuperAdmin && ['national-overview', 'national-governance', 'national-policies', 'national-dashboard', 'master'].includes(currentPage)
  const nationalNavItems = isSuperAdmin ? [NATIONAL_OVERVIEW_ITEM, ...navItems.slice(0, 2), NATIONAL_GOVERNANCE_ITEM, NATIONAL_POLICY_ITEM] : []
  const chapterNavItems = navItems.slice(2, 7)
  const dataNavItems = [
    ...navItems.slice(7).filter(item => item.id !== 'logs' || isSuperAdmin),
    ...(currentUser?.role === 'chapter_admin' ? [PIC_ACCOUNTS_ITEM] : []),
  ]

  useEffect(() => {
    let cancelled = false

    async function loadSidebarContext() {
    try {
      const storedUser = localStorage.getItem('user')
      setCurrentUser(storedUser ? JSON.parse(storedUser) : null)
      const routeMatch = window.location.pathname.match(/^\/chapter\/([^/]+)/)
      if (routeMatch?.[1]) {
        const chapterId = decodeURIComponent(routeMatch[1])
        setActiveChapterId(chapterId)
        try {
          const response = await fetch(`/api/chapter-context/${encodeURIComponent(chapterId)}`, { cache: 'no-store' })
          const context = await response.json()
          if (response.ok && context?.chapter?.id) {
            localStorage.setItem('selectedChapterContext', JSON.stringify(context))
          }
        } catch {
          // Keep existing local context if refresh fails.
        }
      } else {
        const selected = localStorage.getItem('selectedChapterContext')
        const selectedContext = selected ? JSON.parse(selected) : null
        const tenant = localStorage.getItem('tenantContext')
        const tenantContext = tenant ? JSON.parse(tenant) : null
        const user = storedUser ? JSON.parse(storedUser) : null
        setActiveChapterId(selectedContext?.chapter?.id || tenantContext?.chapter?.id || user?.chapter_id || '')
      }
      if (!cancelled) setBranding(getChapterBranding())
    } catch {
      setCurrentUser(null)
    }
    }

    loadSidebarContext()

    return () => {
      cancelled = true
    }
  }, [])

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) return
    if (newPw !== confirmPw) {
      setPwError('Password baru dan konfirmasi tidak cocok.')
      return
    }
    setPwSaving(true)
    setPwError('')
    setPwSuccess('')
    try {
      const res = await fetch('/api/my-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal mengubah password.')
      setPwSuccess('Password berhasil diubah.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setShowNewPw(false)
    } catch (err: any) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  const handleNavigate = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  const resolvePath = (item: any) => {
    if (item.path?.startsWith('/')) return item.path
    return activeChapterId ? `/chapter/${encodeURIComponent(activeChapterId)}/${item.path}` : item.fallbackPath
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
            {isNationalArea ? 'BNI INDONESIA' : branding.chapterName.toUpperCase()}
          </div>
          <div className="text-[17px] font-semibold text-gray-950 leading-tight tracking-[-0.01em]">
            {isNationalArea ? 'Chapter Manager' : branding.displayName}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isNationalArea ? 'BNI Chapter Platform' : (branding.locationLabel || 'Visitor Manager')}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Menu Section */}
          <div className="mb-5">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-2 mb-1">
              MENU
            </div>
            {(isNationalArea ? nationalNavItems : chapterNavItems).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(resolvePath(item))}
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
          {!isNationalArea && (
          <div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-3 py-2 mb-1">
              DATA
            </div>
            {dataNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(resolvePath(item))}
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
          )}

          {isSuperAdmin && !isNationalArea && (
            <div className="mt-5 border-t border-white/60 pt-4">
              <button
                onClick={() => handleNavigate('/national-dashboard')}
                className="w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-left text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-100"
              >
                Kembali ke Manage Chapter
              </button>
            </div>
          )}
        </nav>

        <div className="border-t border-white/60 px-5 py-4 space-y-2">
          {currentUser?.role === 'pic' && (
            <div>
              {showPasswordPanel ? (
                <form onSubmit={handlePasswordChange} className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Ubah Password Saya</p>
                  <input
                    className="w-full h-9 rounded-xl border border-gray-200 bg-white/80 px-3 text-xs font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                    type="password"
                    placeholder="Password lama"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    required
                  />
                  <div className="relative">
                    <input
                      className="w-full h-9 rounded-xl border border-gray-200 bg-white/80 px-3 pr-9 text-xs font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="Password baru"
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPw(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPw ? (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <input
                    className="w-full h-9 rounded-xl border border-gray-200 bg-white/80 px-3 text-xs font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                    type="password"
                    placeholder="Konfirmasi password baru"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    required
                  />
                  {pwError && <p className="text-[11px] text-red-600">{pwError}</p>}
                  {pwSuccess && <p className="text-[11px] text-emerald-600">{pwSuccess}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="flex-1 h-9 rounded-xl bg-red-600 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {pwSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordPanel(false)
                        setCurrentPw('')
                        setNewPw('')
                        setConfirmPw('')
                        setShowNewPw(false)
                        setPwError('')
                        setPwSuccess('')
                      }}
                      className="h-9 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => { setShowPasswordPanel(true); setPwError(''); setPwSuccess('') }}
                  className="w-full rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Ubah Password Saya
                </button>
              )}
            </div>
          )}
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
