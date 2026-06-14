'use client'

import { FormEvent, useEffect, useState } from 'react'

type PicAccount = {
  id: string
  name: string
  email: string
  phone?: string
  is_active: boolean
  chapter_id: string
}

const inputClass =
  'h-11 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100'

function EyeOpenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
    </svg>
  )
}

export default function ManagePicAccounts({ chapterId }: { chapterId: string }) {
  const [pics, setPics] = useState<PicAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null)

  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '' })
  const [newPassword, setNewPassword] = useState('')

  const [showAddPassword, setShowAddPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  useEffect(() => {
    loadPics()
  }, [chapterId])

  async function loadPics() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/pic-accounts?chapterId=${encodeURIComponent(chapterId)}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat data PIC.')
      setPics(data.pics || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch('/api/pic-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan.')
    return data
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiPost({ action: 'create', chapterId, ...addForm })
      setAddForm({ name: '', email: '', phone: '', password: '' })
      setShowAddPassword(false)
      setSuccess('Akun PIC berhasil ditambahkan.')
      await loadPics()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!editingId || !editForm.name.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiPost({ action: 'update', id: editingId, ...editForm })
      setEditingId(null)
      setSuccess('Akun PIC berhasil diperbarui.')
      await loadPics()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()
    if (!passwordTargetId || !newPassword.trim()) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiPost({ action: 'set-password', id: passwordTargetId, password: newPassword })
      setPasswordTargetId(null)
      setNewPassword('')
      setShowEditPassword(false)
      setSuccess('Password berhasil diubah.')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await apiPost({ action: 'toggle', id, isActive })
      setSuccess(`Akun berhasil ${isActive ? 'dinonaktifkan' : 'diaktifkan'}.`)
      await loadPics()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(pic: PicAccount) {
    setEditingId(pic.id)
    setEditForm({ name: pic.name, phone: pic.phone || '' })
    setPasswordTargetId(null)
    setNewPassword('')
    setShowEditPassword(false)
  }

  function openPasswordReset(pic: PicAccount) {
    setPasswordTargetId(pic.id)
    setNewPassword('')
    setShowEditPassword(false)
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setShowEditPassword(false)
  }

  function cancelPasswordReset() {
    setPasswordTargetId(null)
    setNewPassword('')
    setShowEditPassword(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">Chapter Admin</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">Akun PIC</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola akun login untuk anggota yang berperan sebagai PIC di chapter ini.
            </p>
          </div>
          <button
            onClick={loadPics}
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      )}

      {/* Add PIC form */}
      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Tambah Akun PIC</h2>
        <form onSubmit={handleAdd} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input
            className={inputClass}
            placeholder="Nama lengkap"
            value={addForm.name}
            onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className={inputClass}
            placeholder="Email"
            type="email"
            value={addForm.email}
            onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className={inputClass}
            placeholder="No. telepon (opsional)"
            value={addForm.phone}
            onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
          />
          <div className="relative">
            <input
              className={inputClass + ' w-full pr-10'}
              placeholder="Password"
              type={showAddPassword ? 'text' : 'password'}
              value={addForm.password}
              onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowAddPassword(v => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showAddPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
          <button
            disabled={saving}
            type="submit"
            className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50"
          >
            Tambah PIC
          </button>
        </form>
      </div>

      {/* PIC list */}
      <div className="rounded-2xl border border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Daftar Akun PIC</h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : pics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-8 m-5 text-center text-sm text-gray-500">
            Belum ada akun PIC. Tambahkan akun untuk anggota yang menjadi PIC.
          </div>
        ) : (
          <div>
            {pics.map(pic => (
              <div key={pic.id} className="border-b border-gray-100 p-4 last:border-b-0">
                {editingId === pic.id ? (
                  <form onSubmit={handleUpdate} className="flex flex-wrap items-end gap-3">
                    <input
                      className={`${inputClass} flex-1 min-w-[160px]`}
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nama"
                      required
                    />
                    <input
                      className={`${inputClass} flex-1 min-w-[140px]`}
                      value={editForm.phone}
                      onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="No. telepon (opsional)"
                    />
                    <button
                      disabled={saving}
                      type="submit"
                      className="h-11 rounded-xl bg-red-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="h-11 rounded-xl border border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </form>
                ) : passwordTargetId === pic.id ? (
                  <form onSubmit={handleSetPassword} className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="mb-1.5 text-xs font-semibold text-gray-500">
                        Reset password untuk{' '}
                        <span className="text-gray-900">{pic.name}</span>
                      </p>
                      <div className="relative">
                        <input
                          className={inputClass + ' w-full pr-10'}
                          type={showEditPassword ? 'text' : 'password'}
                          placeholder="Password baru"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowEditPassword(v => !v)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                          {showEditPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                        </button>
                      </div>
                    </div>
                    <button
                      disabled={saving}
                      type="submit"
                      className="h-11 rounded-xl bg-red-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Simpan Password
                    </button>
                    <button
                      type="button"
                      onClick={cancelPasswordReset}
                      className="h-11 rounded-xl border border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-bold text-gray-950">{pic.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {pic.email}
                        {pic.phone ? ` · ${pic.phone}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          pic.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {pic.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button
                        onClick={() => openEdit(pic)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openPasswordReset(pic)}
                        className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleToggle(pic.id, pic.is_active)}
                        disabled={saving}
                        className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {pic.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
