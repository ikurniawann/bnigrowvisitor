'use client'

import { useEffect, useMemo, useState } from 'react'
import { ActivityLog, loadActivityLogs } from '@/lib/activityLog'
import { User } from '@/lib/supabase'
import { getUserLevelLabel, isNationalAdmin, NATIONAL_ADMIN_EMAIL } from '@/lib/permissions'

const actionLabels: Record<string, string> = {
  insert: 'Insert',
  update: 'Update',
  delete: 'Delete',
}

const actionStyles: Record<string, string> = {
  insert: 'bg-emerald-100 text-emerald-800',
  update: 'bg-amber-100 text-amber-800',
  delete: 'bg-red-100 text-red-800',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getChangedFields(log: ActivityLog) {
  if (log.action !== 'update') return []

  const oldData = log.old_data || {}
  const newData = log.new_data || {}

  return Object.keys(newData)
    .filter(key => !['created_at', 'updated_at'].includes(key))
    .filter(key => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]))
    .slice(0, 6)
}

export default function ActivityLogs() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')

  const isSuperAdmin = isNationalAdmin(currentUser)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      setCurrentUser(storedUser ? JSON.parse(storedUser) : null)
    } catch {
      setCurrentUser(null)
    }
  }, [])

  useEffect(() => {
    async function loadLogs() {
      if (!currentUser) return

      if (!isSuperAdmin) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        setLogs(await loadActivityLogs(300))
      } catch (err: any) {
        setError(err.message || 'Gagal memuat log.')
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [currentUser, isSuperAdmin])

  const entityOptions = useMemo(
    () => Array.from(new Set(logs.map(log => log.entity))).sort(),
    [logs]
  )

  const filteredLogs = logs.filter(log => {
    if (actionFilter && log.action !== actionFilter) return false
    if (entityFilter && log.entity !== entityFilter) return false

    if (search) {
      const keyword = search.toLowerCase()
      const haystack = [
        log.actor_name,
        log.actor_email,
        log.actor_role,
        log.action,
        log.entity,
        log.entity_label,
      ].filter(Boolean).join(' ').toLowerCase()

      if (!haystack.includes(keyword)) return false
    }

    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-950">Akses Log Terbatas</h1>
        <p className="mt-2 text-sm text-gray-500">Menu Log hanya tersedia untuk Admin / Super Admin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Log Aktivitas</h1>
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">
              Super Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">Jejak perubahan data oleh PIC, member, dan admin.</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
          <div className="text-2xl font-bold text-red-700">{filteredLogs.length}</div>
          <div className="text-xs text-gray-500">Log ditampilkan</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari user, email, data, action..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-red-500"
          >
            <option value="">Semua Action</option>
            <option value="insert">Insert</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-red-500"
          >
            <option value="">Semua Data</option>
            {entityOptions.map(entity => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm">
        {/* Mobile: card view */}
        <div className="sm:hidden divide-y divide-gray-100">
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">Belum ada log aktivitas.</div>
          ) : filteredLogs.map(log => {
            const changedFields = getChangedFields(log)
            return (
              <div key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{log.actor_name || 'System'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{log.actor_email || '-'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${actionStyles[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-1.5 capitalize">
                  <span className="font-medium">{log.entity.replace(/_/g, ' ')}</span>
                  {log.entity_label ? ` · ${log.entity_label}` : ''}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">{formatDateTime(log.created_at)}</p>
                  {changedFields.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {changedFields.slice(0, 3).map(field => (
                        <span key={field} className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">{field}</span>
                      ))}
                      {changedFields.length > 3 && <span className="text-[10px] text-gray-400">+{changedFields.length - 3}</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-gradient-to-r from-red-600 to-orange-500 text-left text-[11px] font-bold uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                    Belum ada log aktivitas.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const changedFields = getChangedFields(log)

                  return (
                    <tr key={log.id} className="border-t border-gray-100 align-top hover:bg-red-50/40">
                      <td className="whitespace-nowrap px-4 py-4 text-[13px] font-medium text-gray-700">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[13px] font-bold text-gray-950">{log.actor_name || 'System'}</div>
                        <div className="text-xs text-gray-500">{log.actor_email || '-'}</div>
                        <div className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                          {log.actor_email === NATIONAL_ADMIN_EMAIL || log.actor_role === 'national_admin'
                            ? 'National Admin'
                            : getUserLevelLabel({ role: log.actor_role as any, email: log.actor_email || '' })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${actionStyles[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[13px] font-bold capitalize text-gray-950">{log.entity.replace(/_/g, ' ')}</div>
                        <div className="mt-1 max-w-[240px] truncate text-xs text-gray-500">{log.entity_label || log.entity_id || '-'}</div>
                      </td>
                      <td className="px-4 py-4">
                        {changedFields.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {changedFields.map(field => (
                              <span key={field} className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-800">
                                {field}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="max-w-[280px] truncate text-[13px] text-gray-600">
                            {log.action === 'insert' ? 'Data baru dibuat' : log.action === 'delete' ? 'Data dihapus' : 'Update data'}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
