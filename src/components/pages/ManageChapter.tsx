'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type Chapter = {
  id: string
  area_id: string
  name: string
  display_name: string
  is_active: boolean
  area?: { id: string; name: string; city?: { id: string; name: string } }
}

type ChapterAdmin = {
  id: string
  name: string
  email: string
  phone?: string
  is_active: boolean
  chapter_id: string
}

type Area = { id: string; city_id: string; name: string; is_active: boolean }
type City = { id: string; name: string }

const inputClass =
  'h-11 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100'
const selectClass = `${inputClass} appearance-none`

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-8 text-center text-sm text-gray-500">
      Belum ada {label}.
    </div>
  )
}

export default function ManageChapter() {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)

  return selectedChapter ? (
    <ChapterAdminView
      chapter={selectedChapter}
      onBack={() => setSelectedChapter(null)}
    />
  ) : (
    <ChapterListView onSelectChapter={setSelectedChapter} />
  )
}

function ChapterListView({ onSelectChapter }: { onSelectChapter: (c: Chapter) => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [form, setForm] = useState({ id: '', area_id: '', name: '', display_name: '' })

  const areaById = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas])
  const cityById = useMemo(() => new Map(cities.map(c => [c.id, c])), [cities])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/master-data', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat data.')
      setChapters(data.chapters || [])
      setAreas(data.areas || [])
      setCities(data.cities || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function masterRequest(body: Record<string, unknown>) {
    const res = await fetch('/api/master-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Gagal menyimpan.')
    return data
  }

  async function saveChapter(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.display_name.trim() || !form.area_id) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        display_name: form.display_name.trim(),
        area_id: form.area_id,
        updated_at: new Date().toISOString(),
      }
      await masterRequest(form.id
        ? { action: 'upsert', table: 'chapters', id: form.id, payload }
        : { action: 'upsert', table: 'chapters', payload }
      )
      setForm({ id: '', area_id: '', name: '', display_name: '' })
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleChapter(id: string, isActive: boolean) {
    setSaving(true)
    try {
      await masterRequest({ action: 'toggle', table: 'chapters', id, payload: { is_active: !isActive } })
      await load()
    } finally {
      setSaving(false)
    }
  }

  function openChapter(chapter: Chapter) {
    const area = areaById.get(chapter.area_id)
    const city = area ? cityById.get(area.city_id) : undefined
    localStorage.setItem('selectedChapterContext', JSON.stringify({
      chapter: { id: chapter.id, name: chapter.name, display_name: chapter.display_name },
      area: area ? { id: area.id, name: area.name } : null,
      city: city ? { id: city.id, name: city.name } : null,
    }))
    onSelectChapter({ ...chapter, area: area ? { id: area.id, name: area.name, city: city ? { id: city.id, name: city.name } : undefined } : undefined })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">BNI Indonesia</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">Manage Chapter</h1>
            <p className="mt-1 text-sm text-gray-500">Kelola chapter dan akun admin. Klik &ldquo;Buka Data&rdquo; untuk mengelola akun admin chapter.</p>
          </div>
          <button onClick={load} className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Tambah / Edit Chapter</h2>
        <form onSubmit={saveChapter} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <select className={selectClass} value={form.area_id} onChange={e => setForm(p => ({ ...p, area_id: e.target.value }))}>
            <option value="">Pilih area</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input className={inputClass} placeholder="Kode chapter, contoh BNI Grow" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <input className={inputClass} placeholder="Display name, contoh BNI Grow Chapter" value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
          <div className="flex gap-2">
            <button disabled={saving} type="submit" className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
              {form.id ? 'Update' : 'Tambah'}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm({ id: '', area_id: '', name: '', display_name: '' })} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Daftar Chapter</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : chapters.length === 0 ? (
          <div className="p-5"><EmptyState label="chapter" /></div>
        ) : (
          <div>
            {chapters.map(chapter => {
              const area = areaById.get(chapter.area_id)
              const city = area ? cityById.get(area.city_id) : undefined
              return (
                <div key={chapter.id} className="flex flex-col gap-3 border-b border-gray-100 p-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-950">{chapter.display_name}</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {chapter.name}
                      {area ? ` · ${area.name}` : ''}
                      {city ? ` · ${city.name}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${chapter.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {chapter.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      onClick={() => openChapter(chapter)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                    >
                      Buka Data
                    </button>
                    <button
                      onClick={() => setForm({ id: chapter.id, area_id: chapter.area_id, name: chapter.name, display_name: chapter.display_name })}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleChapter(chapter.id, chapter.is_active)}
                      disabled={saving}
                      className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {chapter.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ChapterAdminView({ chapter, onBack }: { chapter: Chapter; onBack: () => void }) {
  const [admins, setAdmins] = useState<ChapterAdmin[]>([])
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
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => { loadAdmins() }, [chapter.id])

  async function loadAdmins() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/chapter-admins?chapterId=${encodeURIComponent(chapter.id)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat data admin.')
      setAdmins(data.admins || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function apiPost(body: Record<string, unknown>) {
    const res = await fetch('/api/chapter-admins', {
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
      await apiPost({ action: 'create', chapterId: chapter.id, ...addForm })
      setAddForm({ name: '', email: '', phone: '', password: '' })
      setSuccess('Akun admin berhasil ditambahkan.')
      await loadAdmins()
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
      setSuccess('Akun admin berhasil diperbarui.')
      await loadAdmins()
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
      await loadAdmins()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function enterChapter() {
    window.location.href = `/chapter/${encodeURIComponent(chapter.id)}/dashboard`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">Manage Chapter</p>
              <h1 className="mt-0.5 text-2xl font-bold text-gray-950">{chapter.display_name}</h1>
              {chapter.area && (
                <p className="text-sm text-gray-500">
                  {chapter.area.name}{chapter.area.city ? ` · ${chapter.area.city.name}` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={enterChapter}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-red-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Masuk ke Chapter
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>
      )}

      {/* Add admin form */}
      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Tambah Akun Admin</h2>
        <form onSubmit={handleAdd} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input className={inputClass} placeholder="Nama lengkap" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required />
          <input className={inputClass} placeholder="Email" type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} required />
          <input className={inputClass} placeholder="No. telepon (opsional)" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} />
          <div className="relative">
            <input className={inputClass + ' w-full pr-10'} placeholder="Password" type={showAddPassword ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} required />
            <button type="button" tabIndex={-1} onClick={() => setShowAddPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
              {showAddPassword ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <button disabled={saving} type="submit" className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
            Tambah Admin
          </button>
        </form>
      </div>

      {/* Admin list */}
      <div className="rounded-2xl border border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Akun Admin Chapter</h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="p-5"><EmptyState label="akun admin untuk chapter ini" /></div>
        ) : (
          <div>
            {admins.map(admin => (
              <div key={admin.id} className="border-b border-gray-100 p-4 last:border-b-0">
                {editingId === admin.id ? (
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
                    <button disabled={saving} type="submit" className="h-11 rounded-xl bg-red-600 px-4 text-xs font-bold text-white disabled:opacity-50">Simpan</button>
                    <button type="button" onClick={() => setEditingId(null)} className="h-11 rounded-xl border border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
                  </form>
                ) : passwordTargetId === admin.id ? (
                  <form onSubmit={handleSetPassword} className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="mb-1.5 text-xs font-semibold text-gray-500">Reset password untuk <span className="text-gray-900">{admin.name}</span></p>
                      <div className="relative">
                        <input
                          className={inputClass + ' w-full pr-10'}
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Password baru"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                          {showNewPassword ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <button disabled={saving} type="submit" className="h-11 rounded-xl bg-red-600 px-4 text-xs font-bold text-white disabled:opacity-50">Simpan Password</button>
                    <button type="button" onClick={() => { setPasswordTargetId(null); setNewPassword(''); setShowNewPassword(false) }} className="h-11 rounded-xl border border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-bold text-gray-950">{admin.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{admin.email}{admin.phone ? ` · ${admin.phone}` : ''}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {admin.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <button
                        onClick={() => { setEditingId(admin.id); setEditForm({ name: admin.name, phone: admin.phone || '' }) }}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setPasswordTargetId(admin.id); setNewPassword(''); setShowNewPassword(false) }}
                        className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                      >
                        Ubah Password
                      </button>
                      <button
                        onClick={() => handleToggle(admin.id, admin.is_active)}
                        disabled={saving}
                        className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}
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
