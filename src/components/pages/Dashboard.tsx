'use client'

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
  const { getStats, getIndustryDistribution, getStatusDistribution, getReferrerDistribution, visitors } = useData()
  const stats = getStats()

  const recentVisitors = visitors.slice(0, 8)
  const statusDist = getStatusDistribution()
  const industryDist = getIndustryDistribution()
  const referrerDist = getReferrerDistribution()

  const maxStatusCount = Math.max(...Object.values(statusDist), 1)
  const maxIndustryCount = Math.max(...industryDist.map(([, c]) => c), 1)
  const maxReferrerCount = Math.max(...referrerDist.map(([, c]) => c), 1)

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
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Visitor</div>
            </div>
            <div className="text-2xl opacity-40">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-green-600">{stats.confirmed}</div>
              <div className="text-xs text-gray-500 mt-1">Konfirmasi Hadir</div>
            </div>
            <div className="text-2xl opacity-40">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-gray-500 mt-1">Pending Follow Up</div>
            </div>
            <div className="text-2xl opacity-40">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-3xl font-bold text-purple-600">{stats.member}</div>
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
            {Object.entries(statusDist).map(([status, count]) => (
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

        {/* Top Diajak Oleh Chart - Full Width */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>🏆</span>
            Top Diajak Oleh (Member)
          </h3>
          <div className="space-y-4">
            {referrerDist.length > 0 ? (
              referrerDist.map(([name, count]) => (
                <div key={name} className="flex items-center gap-4">
                  <div className="w-48 text-sm text-gray-700 truncate" title={name}>{name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxReferrerCount) * 100}%`, minWidth: '30px' }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm font-bold text-gray-900">{count}</div>
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
