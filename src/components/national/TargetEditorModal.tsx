'use client'

import { useEffect, useState } from 'react'
import type { ChapterTarget } from '@/lib/national/types'

interface ChapterOption {
  id: string
  display_name: string
}

interface TargetEditorModalProps {
  chapters: ChapterOption[]
  onClose: () => void
  onSaved: () => void
}

const FIELDS: { key: keyof ChapterTarget; label: string; unit?: string }[] = [
  { key: 'visitors_per_meeting', label: 'Visitor per Meeting' },
  { key: 'member_conversion_pct', label: 'Konversi Member', unit: '%' },
  { key: 'min_active_pic', label: 'Minimal PIC Aktif' },
  { key: 'min_weekly_meetings_per_month', label: 'Minimal Weekly Meeting / Bulan' },
]

type TargetRow = ChapterTarget & { chapter_id: string | null }

export default function TargetEditorModal({ chapters, onClose, onSaved }: TargetEditorModalProps) {
  const [defaults, setDefaults] = useState<ChapterTarget | null>(null)
  const [rows, setRows] = useState<TargetRow[]>([])
  const [scope, setScope] = useState<string>('') // '' = national default, else chapterId
  const [form, setForm] = useState<ChapterTarget | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/national/targets', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal memuat target.')
      setDefaults(payload.defaults)
      setRows(payload.targets || [])
      if (payload.pendingMigration) setNotice('Tabel target belum dibuat. Jalankan migration 012 dulu.')
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat target.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Sync the form whenever scope changes or data loads.
  useEffect(() => {
    if (!defaults) return
    const targetChapterId = scope || null
    const existing = rows.find(row => (row.chapter_id || null) === targetChapterId)
    const source = existing || (scope ? rows.find(r => !r.chapter_id) : null) || defaults
    setForm({
      visitors_per_meeting: source.visitors_per_meeting,
      member_conversion_pct: source.member_conversion_pct,
      min_active_pic: source.min_active_pic,
      min_weekly_meetings_per_month: source.min_weekly_meetings_per_month,
    })
  }, [scope, defaults, rows])

  const hasOverride = (chapterId: string) => rows.some(row => row.chapter_id === chapterId)

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/national/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: scope || null, ...form }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal menyimpan target.')
      setNotice('Target tersimpan.')
      await load()
      onSaved()
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan target.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOverride = async () => {
    if (!scope) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/national/targets?chapterId=${encodeURIComponent(scope)}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal menghapus override.')
      setNotice('Override dihapus, chapter ini kembali ke target nasional.')
      await load()
      onSaved()
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus override.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-950">Atur Target &amp; KPI</h2>
            <p className="mt-1 text-sm text-gray-500">Set target nasional atau override per chapter.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Scope</label>
          <select
            value={scope}
            onChange={event => setScope(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">Target Nasional (default semua chapter)</option>
            {chapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.display_name}{hasOverride(chapter.id) ? ' (override)' : ''}
              </option>
            ))}
          </select>
        </div>

        {notice && <div className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{notice}</div>}
        {error && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}

        {loading || !form ? (
          <div className="py-10 text-center text-sm text-gray-400">Memuat…</div>
        ) : (
          <div className="mt-4 space-y-3">
            {FIELDS.map(field => (
              <label key={field.key} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700">{field.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={form[field.key]}
                    onChange={event => setForm(prev => (prev ? { ...prev, [field.key]: Number(event.target.value) } : prev))}
                    className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-right text-sm font-bold text-gray-900 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                  {field.unit && <span className="text-xs font-semibold text-gray-400">{field.unit}</span>}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={saving || loading || !form}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : scope ? 'Simpan Override' : 'Simpan Target Nasional'}
          </button>
          {scope && hasOverride(scope) && (
            <button
              onClick={handleDeleteOverride}
              disabled={saving}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Hapus Override
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
