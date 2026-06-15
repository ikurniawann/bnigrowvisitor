'use client'

import { useEffect, useState } from 'react'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  scope: string
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return '—'
  return new Date(time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)

  // Raw key is returned exactly once on creation — surfaced here until dismissed.
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/national/api-keys', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal memuat API key.')
      setKeys(payload.data || [])
      setNotice(payload.pendingMigration ? 'Tabel api_keys belum ada. Jalankan migration 014.' : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat API key.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama API key wajib diisi.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/national/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), expiresAt: expiresAt || undefined }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal membuat API key.')
      setNewKey(payload.data?.rawKey || null)
      setName('')
      setExpiresAt('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat API key.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string, label: string) {
    if (!confirm(`Nonaktifkan API key "${label}"? Sistem yang memakainya akan langsung kehilangan akses.`)) return
    setError('')
    try {
      const res = await fetch(`/api/national/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Gagal menonaktifkan API key.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menonaktifkan API key.')
    }
  }

  async function copyKey() {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard tidak tersedia; user salin manual */
    }
  }

  return (
    <div className="space-y-5">
      {/* One-time raw key banner */}
      {newKey && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Simpan API key ini sekarang — hanya ditampilkan sekali.</p>
              <p className="mt-0.5 text-xs text-amber-700">Setelah ditutup, key tidak bisa dilihat lagi (hanya hash yang tersimpan). Serahkan ke sistem yang dituju.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-gray-800">{newKey}</code>
                <button onClick={copyKey} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
                  {copied ? 'Tersalin ✓' : 'Salin'}
                </button>
                <button onClick={() => setNewKey(null)} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Buat API Key Baru</h3>
        <p className="mt-0.5 text-xs text-gray-500">Untuk integrasi sistem eksternal (mis. BNI Finance). Scope: <span className="font-semibold">finance</span> — baca member + tulis-balik perpanjangan, seluruh chapter.</p>
        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Nama Key</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: BNI Finance Prod"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Kedaluwarsa (opsional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-red-700 hover:to-red-800 disabled:opacity-50"
          >
            {creating ? 'Membuat…' : 'Generate Key'}
          </button>
        </form>
      </div>

      {notice && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {/* Key list */}
      <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-900">API Key Terdaftar</h3>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Memuat…</div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">Belum ada API key.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Nama</th>
                  <th className="py-2 pr-3 font-semibold">Prefix</th>
                  <th className="py-2 pr-3 font-semibold">Scope</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Dipakai Terakhir</th>
                  <th className="py-2 pr-3 font-semibold">Kedaluwarsa</th>
                  <th className="py-2 pr-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-800">{k.name}</td>
                    <td className="py-2 pr-3 font-mono text-gray-500">{k.key_prefix}…</td>
                    <td className="py-2 pr-3 text-gray-600">{k.scope}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${k.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                        {k.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{formatDateTime(k.last_used_at)}</td>
                    <td className="py-2 pr-3 text-gray-500">{k.expires_at ? formatDateTime(k.expires_at) : '—'}</td>
                    <td className="py-2 pr-3">
                      {k.is_active && (
                        <button onClick={() => handleRevoke(k.id, k.name)} className="rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100">
                          Nonaktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
