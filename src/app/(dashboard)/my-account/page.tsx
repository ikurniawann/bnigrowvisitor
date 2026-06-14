'use client'

import { FormEvent, useEffect, useState } from 'react'
import { User } from '@/lib/supabase'
import { getUserLevelLabel } from '@/lib/permissions'

export default function MyAccountPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Password change form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setCurrentUser(JSON.parse(stored))
  }, [])

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    if (!currentPw || !newPw || !confirmPw) return
    if (newPw !== confirmPw) {
      setError('Password baru dan konfirmasi tidak cocok.')
      return
    }
    if (newPw.length < 6) {
      setError('Password baru minimal 6 karakter.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/my-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', currentPassword: currentPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal mengubah password.')
      setSuccess('Password berhasil diubah.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setShowNewPw(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  const levelLabel = getUserLevelLabel(currentUser)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profil Akun</h1>
        <p className="text-sm text-gray-500 mt-1">Informasi akun dan pengaturan keamanan</p>
      </div>

      {/* User info card */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center text-xl font-bold shadow-md flex-shrink-0">
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{currentUser?.name || '—'}</p>
            <p className="text-sm text-gray-500">{currentUser?.email || '—'}</p>
            <span className="inline-block mt-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              {levelLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {currentUser?.chapter_name && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5 font-medium">Chapter</p>
              <p className="font-semibold text-gray-800 truncate">{currentUser.chapter_display_name || currentUser.chapter_name}</p>
            </div>
          )}
          {currentUser?.city_name && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5 font-medium">Kota</p>
              <p className="font-semibold text-gray-800">{currentUser.city_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Password change card */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Ubah Password
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password Lama</label>
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Masukkan password lama"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNewPw(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showNewPw ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Ulangi password baru"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  )
}
