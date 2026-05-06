'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/hooks/useData'

const STATUSES = {
  new:          { label: 'Baru Daftar',      color: '#dbeafe' },
  followup:     { label: 'Follow Up',         color: '#fef3c7' },
  confirmed:    { label: 'Konfirmasi Hadir',  color: '#dcfce7' },
  attended:     { label: 'Hadir',             color: '#d1fae5' },
  no_show:      { label: 'Tidak Hadir',       color: '#fee2e2' },
  interview:    { label: 'Interview',         color: '#ede9fe' },
  member:       { label: 'Jadi Member',       color: '#ccfbf1' },
  not_continue: { label: 'Tidak Lanjut',      color: '#f3f4f6' },
}

export default function Dashboard() {
  const router = useRouter()
  const { getStats, getIndustryDistribution, getStatusDistribution, getReferrerDistribution, visitors, meetings } = useData()
  
  // Filter state
  const [meetingFilter, setMeetingFilter] = useState<string>('')
  
  // Filter visitors by meeting if selected
  const filteredVisitors = meetingFilter 
    ? visitors.filter(v => v.meeting_id === meetingFilter)
    : visitors
  
  const stats = getStats()
  const filteredStats = meetingFilter
    ? {
        total: filteredVisitors.length,
        confirmed: filteredVisitors.filter(v => v.status === 'confirmed').length,
        pending: filteredVisitors.filter(v => v.status === 'followup').length,
        member: filteredVisitors.filter(v => v.status === 'member').length,
      }
    : stats
  const recentVisitors = filteredVisitors.slice(0, 8)
  
  const statusDist = getStatusDistribution()
  const filteredStatusDist = meetingFilter
    ? (() => {
        const dist: Record<string, number> = {}
        filteredVisitors.forEach(v => {
          dist[v.status] = (dist[v.status] || 0) + 1
        })
        return dist
      })()
    : statusDist
  
  const industryDist = getIndustryDistribution()
  const filteredIndustryDist = meetingFilter
    ? (() => {
        const dist: Record<string, number> = {}
        filteredVisitors.forEach(v => {
          const field = v.business_field || 'Lainnya'
          dist[field] = (dist[field] || 0) + 1
        })
        return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 5) as [string, number][]
      })()
    : industryDist
  
  const referrerDist = getReferrerDistribution()
  const filteredReferrerDist = meetingFilter
    ? (() => {
        const dist: Record<string, number> = {}
        filteredVisitors.forEach(v => {
          if (v.status === 'no_show') return
          const referrerName = (v as any).referred_by_member_name
          if (referrerName) {
            dist[referrerName] = (dist[referrerName] || 0) + 1
          }
        })
        return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][]
      })()
    : referrerDist

  const maxStatusCount = Math.max(...Object.values(filteredStatusDist).map(v => v || 1), 1)
  const maxIndustryCount = Math.max(...filteredIndustryDist.map(([, c]) => c), 1)
  const maxReferrerCount = Math.max(...filteredReferrerDist.map(([, c]) => c), 1)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-500',
      followup: 'bg-yellow-500',
      confirmed: 'bg-green-500',
      hadir: 'bg-emerald-500',
      tidak_hadir: 'bg-red-500',
      interview: 'bg-purple-500',
      member: 'bg-cyan-500',
      tidak_lanjut: 'bg-gray-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      followup: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      hadir: 'bg-emerald-100 text-emerald-800',
      tidak_hadir: 'bg-red-100 text-red-800',
      interview: 'bg-purple-100 text-purple-800',
      member: 'bg-cyan-100 text-cyan-800',
      tidak_lanjut: 'bg-gray-100 text-gray-800',
    }
    return classes[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Weekly Meeting Filter */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Filter Weekly Meeting:</label>
          <select 
            value={meetingFilter} 
            onChange={(e) => setMeetingFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">Semua Meeting</option>
            {meetings.map(meeting => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.title} - {new Date(meeting.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          {meetingFilter && (
            <button
              onClick={() => setMeetingFilter('')}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-blue-600">{filteredStats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Visitor</div>
            </div>
            <div className="text-2xl opacity-40">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-green-600">{filteredStats.confirmed}</div>
              <div className="text-xs text-gray-500 mt-1">Konfirmasi Hadir</div>
            </div>
            <div className="text-2xl opacity-40">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-yellow-600">{filteredStats.pending}</div>
              <div className="text-xs text-gray-500 mt-1">Pending Follow Up</div>
            </div>
            <div className="text-2xl opacity-40">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-purple-600">{filteredStats.member}</div>
              <div className="text-xs text-gray-500 mt-1">Jadi Member</div>
            </div>
            <div className="text-2xl opacity-40">🏆</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Chart */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Status Visitor</h3>
          <div className="space-y-3">
            {Object.entries(filteredStatusDist).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 truncate">
                  {STATUSES[status as keyof typeof STATUSES]?.label || status}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full ${getStatusColor(status)} transition-all duration-500`}
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-semibold">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row 1: Only Top Industry */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Industri</h3>
          <div className="space-y-3">
            {filteredIndustryDist.map(([industry, count]) => (
              <div key={industry} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 truncate">{industry}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(count / maxIndustryCount) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-semibold">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Top Diajak Oleh - Horizontal Bars (Full Width) */}
        <div className="bg-white rounded-xl shadow p-6 mt-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🏆</span>
            Top Visitor Brought
          </h3>
          <div className="space-y-3">
            {filteredReferrerDist.length > 0 ? (
              filteredReferrerDist.map(([name, count]) => (
                <div key={name} className="flex items-center gap-4">
                  <div className="w-36 text-xs text-gray-600 truncate">{name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxReferrerCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-semibold">{count}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 text-sm py-12">
                Belum ada data referral
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Visitors Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">Visitor Terbaru</h3>
          <button 
            onClick={() => router.push('/visitors')}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Lihat Semua →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-600">
                <th className="text-left font-medium px-4 py-3">Nama</th>
                <th className="text-left font-medium px-4 py-3">Bidang Usaha</th>
                <th className="text-left font-medium px-4 py-3">No WA</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentVisitors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Belum ada visitor. Klik &quot;Tambah Visitor&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                recentVisitors.map((visitor) => (
                  <tr key={visitor.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{visitor.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{visitor.business_field || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{visitor.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(visitor.status)}`}>
                        {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
