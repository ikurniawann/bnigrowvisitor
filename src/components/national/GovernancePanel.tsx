'use client'

import { useEffect, useMemo, useState } from 'react'

interface ChapterOption {
  id: string
  display_name: string
}

interface LoginRow {
  id: string
  email: string | null
  success: boolean
  reason: string | null
  ip: string | null
  user_agent: string | null
  chapter_id: string | null
  created_at: string
}

interface ActivityRow {
  id: string
  actor_name: string | null
  actor_email: string | null
  actor_role: string | null
  action: string
  entity: string
  entity_label: string | null
  chapter_id: string | null
  created_at: string
}

function formatDateTime(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return '-'
  return new Date(time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function GovernancePanel() {
  const [tab, setTab] = useState<'login' | 'activity'>('login')
  const [chapterId, setChapterId] = useState('')
  const [chapters, setChapters] = useState<ChapterOption[]>([])
  const [logins, setLogins] = useState<LoginRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetch('/api/chapters', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : { chapters: [] }))
      .then(payload => setChapters(payload.chapters || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : ''
    fetch(`/api/national/audit${query}`, { cache: 'no-store' })
      .then(async res => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload?.error || 'Gagal memuat audit.')
        if (cancelled) return
        setLogins(payload.logins || [])
        setActivity(payload.activity || [])
        setNotice(payload.pendingMigration ? 'Audit login aktif setelah migration 012 dijalankan.' : '')
      })
      .catch(err => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [chapterId])

  const chapterName = useMemo(() => {
    const map = new Map(chapters.map(c => [c.id, c.display_name]))
    return (id: string | null) => (id ? map.get(id) || '—' : '—')
  }, [chapters])

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            <button
              onClick={() => setTab('login')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === 'login' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Audit Login
            </button>
            <button
              onClick={() => setTab('activity')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === 'activity' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Perubahan Data
            </button>
          </div>
          <select
            value={chapterId}
            onChange={event => setChapterId(event.target.value)}
            className="ml-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          >
            <option value="">Semua Chapter</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{notice}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Memuat…</div>
        ) : tab === 'login' ? (
          <LoginTable rows={logins} chapterName={chapterName} />
        ) : (
          <ActivityTable rows={activity} chapterName={chapterName} />
        )}
      </div>
    </div>
  )
}

function LoginTable({ rows, chapterName }: { rows: LoginRow[]; chapterName: (id: string | null) => string }) {
  if (rows.length === 0) return <Empty text="Belum ada catatan login." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
            <th className="py-2 pr-3 font-semibold">Waktu</th>
            <th className="py-2 pr-3 font-semibold">Email</th>
            <th className="py-2 pr-3 font-semibold">Status</th>
            <th className="py-2 pr-3 font-semibold">Chapter</th>
            <th className="py-2 pr-3 font-semibold">IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-gray-50">
              <td className="py-2 pr-3 text-gray-500">{formatDateTime(row.created_at)}</td>
              <td className="py-2 pr-3 font-medium text-gray-800">{row.email || '—'}</td>
              <td className="py-2 pr-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {row.success ? 'Sukses' : row.reason === 'user_not_found' ? 'Email salah' : 'Password salah'}
                </span>
              </td>
              <td className="py-2 pr-3 text-gray-600">{chapterName(row.chapter_id)}</td>
              <td className="py-2 pr-3 text-gray-400">{row.ip || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActivityTable({ rows, chapterName }: { rows: ActivityRow[]; chapterName: (id: string | null) => string }) {
  if (rows.length === 0) return <Empty text="Belum ada perubahan data." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
            <th className="py-2 pr-3 font-semibold">Waktu</th>
            <th className="py-2 pr-3 font-semibold">Aktor</th>
            <th className="py-2 pr-3 font-semibold">Aksi</th>
            <th className="py-2 pr-3 font-semibold">Entitas</th>
            <th className="py-2 pr-3 font-semibold">Chapter</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-gray-50">
              <td className="py-2 pr-3 text-gray-500">{formatDateTime(row.created_at)}</td>
              <td className="py-2 pr-3 font-medium text-gray-800">{row.actor_name || row.actor_email || '—'}<span className="ml-1 text-[10px] text-gray-400">{row.actor_role}</span></td>
              <td className="py-2 pr-3 text-gray-600">{row.action}</td>
              <td className="py-2 pr-3 text-gray-600">{row.entity}{row.entity_label ? ` · ${row.entity_label}` : ''}</td>
              <td className="py-2 pr-3 text-gray-600">{chapterName(row.chapter_id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">{text}</div>
}
