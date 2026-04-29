'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'
import VisitorDetail from './VisitorDetail'

const STATUSES = {
  new:          { label: 'Baru Daftar',      badge: 'bg-blue-100 text-blue-800' },
  followup:     { label: 'Follow Up',         badge: 'bg-yellow-100 text-yellow-800' },
  confirmed:    { label: 'Konfirmasi Hadir',  badge: 'bg-green-100 text-green-800' },
  attended:     { label: 'Hadir',             badge: 'bg-emerald-100 text-emerald-800' },
  no_show:      { label: 'Tidak Hadir',       badge: 'bg-red-100 text-red-800' },
  interview:    { label: 'Interview',         badge: 'bg-purple-100 text-purple-800' },
  member:       { label: 'Jadi Member',       badge: 'bg-cyan-100 text-cyan-800' },
  not_continue: { label: 'Tidak Lanjut',      badge: 'bg-gray-100 text-gray-800' },
}

export default function WeeklyMeeting() {
  const { visitors, loading, reload, addMeeting } = useData()
  
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newMeetingTitle, setNewMeetingTitle] = useState('')
  const [newMeetingDate, setNewMeetingDate] = useState('')
  const [newMeetingLocation, setNewMeetingLocation] = useState('')
  const [adding, setAdding] = useState(false)
  
  // Detail modal
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Get visitors for selected meeting
  const selectedVisitors = selectedMeetingId 
    ? visitors.filter(v => v.meeting_date === selectedMeetingId)
    : []

  // Group by status for summary
  const summary = Object.entries({
    new: 'Baru Daftar',
    followup: 'Follow Up',
    confirmed: 'Konfirmasi Hadir',
    attended: 'Hadir',
    no_show: 'Tidak Hadir',
    interview: 'Interview',
    member: 'Jadi Member',
    not_continue: 'Tidak Lanjut'
  }).reduce((acc, [key]) => {
    acc[key] = selectedVisitors.filter(v => v.status === key).length
    return acc
  }, {} as Record<string, number>)

  const totalVisitors = selectedVisitors.length
  const confirmedCount = summary['confirmed'] || 0
  const hadirCount = summary['hadir'] || 0
  const noShowCount = summary['tidak_hadir'] || 0
  const conversionRate = totalVisitors > 0 ? Math.round((hadirCount / totalVisitors) * 100) : 0

  const handleOpenAdd = () => {
    setNewMeetingTitle('')
    setNewMeetingDate(new Date().toISOString().split('T')[0])
    setNewMeetingLocation('')
    setIsAddModalOpen(true)
  }

  const handleAddMeeting = async () => {
    if (!newMeetingTitle.trim() || !newMeetingDate) {
      alert('Judul dan tanggal wajib diisi')
      return
    }

    setAdding(true)
    try {
      await addMeeting({
        title: newMeetingTitle,
        meeting_date: newMeetingDate,
        location: newMeetingLocation || undefined,
        notes: undefined,
      })
      setIsAddModalOpen(false)
      await reload()
    } catch (err: any) {
      alert('Gagal tambah meeting: ' + err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleOpenDetail = (visitor: any) => {
    setSelectedVisitor(visitor)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedVisitor(null)
  }

  const getStatusBadgeClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.badge || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.label || status
  }

  const getUniqueMeetingDates = () => {
    const dates = [...new Set(visitors.map(v => v.meeting_date).filter(Boolean))]
    return dates.sort().reverse()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Weekly Meeting</h1>
          <p className="text-sm text-gray-500 mt-1">List visitor per sesi meeting</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah Meeting
        </button>
      </div>

      {/* Meeting Selector */}
      <div className="bg-white rounded-xl shadow p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Pilih Sesi Meeting
        </label>
        <select
          value={selectedMeetingId}
          onChange={(e) => setSelectedMeetingId(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
        >
          <option value="">— Pilih Meeting —</option>
          {getUniqueMeetingDates().map(date => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString('id-ID', { 
                weekday: 'long',
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards - Show only when meeting selected */}
      {selectedMeetingId && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-3xl font-bold text-gray-900">{totalVisitors}</div>
              <div className="text-xs text-gray-500 mt-1">Total Visitor</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-3xl font-bold text-green-600">{confirmedCount}</div>
              <div className="text-xs text-gray-500 mt-1">Konfirmasi</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-3xl font-bold text-emerald-600">{hadirCount}</div>
              <div className="text-xs text-gray-500 mt-1">Hadir</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-3xl font-bold text-red-600">{noShowCount}</div>
              <div className="text-xs text-gray-500 mt-1">Tidak Hadir</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-3xl font-bold text-purple-600">{conversionRate}%</div>
              <div className="text-xs text-gray-500 mt-1">Konversi</div>
            </div>
          </div>

          {/* Visitors Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">
                Daftar Visitor - {new Date(selectedMeetingId).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <span className="text-xs text-gray-500">{totalVisitors} visitor</span>
            </div>
            
            {totalVisitors === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="text-gray-500">Belum ada visitor untuk meeting ini</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-add-visitor'))}
                  className="mt-4 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  + Tambah visitor pertama
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-xs text-gray-600">
                      <th className="text-left font-medium px-4 py-3">No</th>
                      <th className="text-left font-medium px-4 py-3">Nama</th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Bidang Usaha</th>
                      <th className="text-left font-medium px-4 py-3">No WA</th>
                      <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Email</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="text-left font-medium px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVisitors.map((visitor, index) => (
                      <tr key={visitor.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{visitor.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {visitor.business_field || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <a 
                            href={`https://wa.me/${visitor.phone.replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            {visitor.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          {visitor.email || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(visitor.status)}`}>
                            {getStatusLabel(visitor.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleOpenDetail(visitor)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Lihat detail"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedMeetingId && (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <svg className="w-20 h-20 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Sesi Meeting</h3>
          <p className="text-gray-500 mb-6">Pilih meeting dari dropdown di atas untuk melihat daftar visitor</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Meeting Baru
          </button>
        </div>
      )}

      {/* Modal: Add Meeting */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Tambah Meeting</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Judul Meeting *
                </label>
                <input
                  type="text"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Contoh: Weekly Meeting 28 April 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tanggal *
                </label>
                <input
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={newMeetingLocation}
                  onChange={(e) => setNewMeetingLocation(e.target.value)}
                  placeholder="Contoh: Hotel Grand Kancana, Bekasi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddMeeting}
                disabled={adding}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {adding ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedVisitor && (
        <VisitorDetail
          visitor={selectedVisitor}
          onClose={handleCloseDetail}
          onEdit={() => handleCloseDetail()}
        />
      )}
    </div>
  )
}
