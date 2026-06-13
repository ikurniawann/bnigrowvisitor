'use client'

import { useEffect, useMemo, useState } from 'react'
import { REQUIRED_FIELD_OPTIONS, DEFAULT_PIPELINE, PolicyType } from '@/lib/national/policies'
import { DEFAULT_WA_TEMPLATES } from '@/lib/waTemplate'

interface ChapterOption {
  id: string
  display_name: string
}

interface PolicyRow {
  chapter_id: string | null
  policy_type: string
  config: Record<string, any>
}

const TABS: { type: PolicyType; label: string }[] = [
  { type: 'wa_template', label: 'Template WA' },
  { type: 'required_fields', label: 'Field Wajib' },
  { type: 'pipeline', label: 'Label Pipeline' },
]

export default function PolicyEditor() {
  const [chapters, setChapters] = useState<ChapterOption[]>([])
  const [rows, setRows] = useState<PolicyRow[]>([])
  const [scope, setScope] = useState('') // '' = national default
  const [tab, setTab] = useState<PolicyType>('wa_template')
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetch('/api/chapters', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : { chapters: [] }))
      .then(payload => setChapters(payload.chapters || []))
      .catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/national/policies', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal memuat policy.')
      setRows(payload.policies || [])
      if (payload.pendingMigration) setNotice('Tabel policy belum dibuat. Jalankan migration 012 dulu.')
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat policy.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const hardDefault = useMemo<Record<PolicyType, Record<string, any>>>(
    () => ({
      wa_template: { online: DEFAULT_WA_TEMPLATES.online, offline: DEFAULT_WA_TEMPLATES.offline },
      required_fields: { fields: REQUIRED_FIELD_OPTIONS.filter(f => f.key === 'phone' || f.key === 'business_field').map(f => f.key) },
      pipeline: { labels: { ...DEFAULT_PIPELINE } },
    }),
    []
  )

  // Resolve the config to edit for the current (scope, tab).
  useEffect(() => {
    const override = rows.find(r => (r.chapter_id || '') === scope && r.policy_type === tab)
    const nationalDefault = rows.find(r => !r.chapter_id && r.policy_type === tab)
    const source = override?.config || (scope ? nationalDefault?.config : null) || hardDefault[tab]
    setConfig(structuredClone(source))
  }, [scope, tab, rows, hardDefault])

  const hasOverride = (chapterId: string, type: PolicyType) =>
    rows.some(r => r.chapter_id === chapterId && r.policy_type === type)

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/national/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyType: tab, chapterId: scope || null, config }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal menyimpan policy.')
      setNotice('Policy tersimpan.')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan policy.')
    } finally {
      setSaving(false)
    }
  }

  const removeOverride = async () => {
    if (!scope) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/national/policies?policyType=${tab}&chapterId=${encodeURIComponent(scope)}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Gagal menghapus override.')
      setNotice('Override dihapus, chapter ini kembali ke default nasional.')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus override.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map(t => (
              <button
                key={t.type}
                onClick={() => setTab(t.type)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === t.type ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={scope}
            onChange={event => setScope(event.target.value)}
            className="ml-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">Default Nasional</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.display_name}{hasOverride(c.id, tab) ? ' (override)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Memuat…</div>
        ) : tab === 'wa_template' ? (
          <WaTemplateForm config={config} setConfig={setConfig} />
        ) : tab === 'required_fields' ? (
          <RequiredFieldsForm config={config} setConfig={setConfig} />
        ) : (
          <PipelineForm config={config} setConfig={setConfig} />
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : scope ? 'Simpan Override Chapter' : 'Simpan Default Nasional'}
          </button>
          {scope && hasOverride(scope, tab) && (
            <button
              onClick={removeOverride}
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

function WaTemplateForm({ config, setConfig }: { config: Record<string, any>; setConfig: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-4">
      {(['online', 'offline'] as const).map(mode => (
        <div key={mode}>
          <label className="mb-1 block text-sm font-semibold capitalize text-gray-700">Template {mode}</label>
          <textarea
            value={config[mode] || ''}
            onChange={event => setConfig({ ...config, [mode]: event.target.value })}
            rows={10}
            className="w-full rounded-xl border border-gray-200 p-3 font-mono text-xs text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>
      ))}
      <p className="text-xs text-gray-400">Variabel: {'{nama}'} {'{pic_nama}'} {'{chapter}'} {'{tanggal_meeting}'} {'{jam_meeting}'} {'{diajak_oleh}'} dll.</p>
    </div>
  )
}

function RequiredFieldsForm({ config, setConfig }: { config: Record<string, any>; setConfig: (c: Record<string, any>) => void }) {
  const fields: string[] = Array.isArray(config.fields) ? config.fields : []
  const toggle = (key: string) => {
    const next = fields.includes(key) ? fields.filter(f => f !== key) : [...fields, key]
    setConfig({ ...config, fields: next })
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {REQUIRED_FIELD_OPTIONS.map(field => (
        <label key={field.key} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
          <input type="checkbox" checked={fields.includes(field.key)} onChange={() => toggle(field.key)} className="h-4 w-4 accent-red-600" />
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
        </label>
      ))}
    </div>
  )
}

function PipelineForm({ config, setConfig }: { config: Record<string, any>; setConfig: (c: Record<string, any>) => void }) {
  const labels: Record<string, string> = config.labels || {}
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Object.entries(DEFAULT_PIPELINE).map(([key, fallback]) => (
        <label key={key} className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-gray-500">{key}</span>
          <input
            value={labels[key] ?? fallback}
            onChange={event => setConfig({ ...config, labels: { ...labels, [key]: event.target.value } })}
            className="w-40 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </label>
      ))}
    </div>
  )
}
