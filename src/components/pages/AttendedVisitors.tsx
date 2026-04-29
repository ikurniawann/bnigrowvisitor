'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'
import VisitorDetail from './VisitorDetail'

const FINAL_STATUSES = {
  interview:    { label: 'Interview',      badge: 'bg-purple-100 text-purple-800', color: 'border-purple-500' },
  member:       { label: 'Jadi Member',    badge: 'bg-cyan-100 text-cyan-800', color: 'border-cyan-500' },
  not_continue: { label: 'Tidak Lanjut',   badge: 'bg-gray-100 text-gray-800', color: 'border-gray-500' },
}

export default function AttendedVisitors() {
  const { visitors, loading, reload, updateVisitor } = useData()
  
  // Filter: hanya visitor dengan status attended atau final statuses
  const attendedVisitors = visitors.filter(v => 
    v.status === 'attended' || 
    ['interview', 'member', 'not_continue'].includes(v.status)
  )
  
  // Group by status
  const grouped = {
    attended: attendedVisitors.filter(v => v.status === 'attended'),
    interview: attendedVisitors.filter(v => v.status === 'interview'),
    member: attendedVisitors.filter(v => v.status === 'member'),
    not_continue: attendedVisitors.filter(v => v.status === 'not_continue'),
  }
  
  // State
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showSubStatusModal, setShowSubStatusModal] = useState(false)
  const [selectedSubStatus, setSelectedSubStatus] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const handleOpenDetail = (visitor: any) => {
    setSelectedVisitor(visitor)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedVisitor(null)
  }

  const handleSubStatusSelect = (subStatus: string) => {
    setSelectedSubStatus(subStatus)
    
    // If "Sudah Ada Tanggal Interview", show date picker
    if (subStatus === 'interview_scheduled') {
      setInterviewDate('')
      return
    }
    
    // If "Tidak Diterima", show reason input
    if (subStatus === 'interview_completed_reject') {
      setRejectReason('')
      return
    }
    
    // For other sub-status, save directly
    saveSubStatus(subStatus, '')
  }

  const saveSubStatus = async (subStatus: string, extraData: string) => {
    if (!selectedVisitor) return
    
    try {
      let note = ''
      const timestamp = new Date().toLocaleString('id-ID', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      switch (subStatus) {
        case 'contacted_no_answer':
          note = `[${timestamp}] [Follow Up] Sudah dihubungi, belum jawab`
          break
        case 'interview_pending_date':
          note = `[${timestamp}] [Interview] Akan di-interview, menunggu jadwal`
          break
        case 'interview_scheduled':
          note = `[${timestamp}] [Interview] Sudah ada tanggal: ${extraData}`
          break
        case 'interview_completed_accept':
          note = `[${timestamp}] [Interview Selesai] DITERIMA - Siap jadi member`
          break
        case 'interview_completed_reject':
          note = `[${timestamp}] [Interview Selesai] TIDAK DITERIMA - Alasan: ${extraData}`
          break
      }
      
      // Add note to visitor
      const currentNotes = selectedVisitor.notes || ''
      await updateVisitor(selectedVisitor.id, {
        notes: currentNotes + (note ? '\n' + note : ''),
        updated_at: new Date().toISOString()
      })
      
      // Auto-change status based on sub-status
      let newStatus = selectedVisitor.status
      if (['interview_completed_accept'].includes(subStatus)) {
        newStatus = 'member'
      } else if (['interview_completed_reject'].includes(subStatus)) {
        newStatus = 'not_continue'
      } else if (['interview_scheduled', 'interview_pending_date'].includes(subStatus)) {
        newStatus = 'interview'
      }
      
      if (newStatus !== selectedVisitor.status) {
        await updateVisitor(selectedVisitor.id, {
          status: newStatus as any,
          updated_at: new Date().toISOString()
        })
      }
      
      await reload()
      setShowSubStatusModal(false)
      setSelectedSubStatus(null)
      setRejectReason('')
      setInterviewDate('')
    } catch (err: any) {
      alert('Gagal update: ' + err.message)
    }
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

  const filteredVisitors = filterStatus === 'all' 
    ? attendedVisitors 
    : grouped[filterStatus as keyof typeof grouped] || []

  // Pagination
  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVisitors = filteredVisitors.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Visitor Hadir</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola visitor yang sudah hadir</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-emerald-500">
          <div className="text-3xl font-bold text-emerald-600">{grouped.attended.length}</div>
          <div className="text-xs text-gray-500 mt-1">Hadir</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
          <div className="text-3xl font-bold text-purple-600">{grouped.interview.length}</div>
          <div className="text-xs text-gray-500 mt-1">Interview</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-cyan-500">
          <div className="text-3xl font-bold text-cyan-600">{grouped.member.length}</div>
          <div className="text-xs text-gray-500 mt-1">Jadi Member</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-gray-500">
          <div className="text-3xl font-bold text-gray-600">{grouped.not_continue.length}</div>
          <div className="text-xs text-gray-500 mt-1">Tidak Lanjut</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filterStatus === 'all'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Semua ({attendedVisitors.length})
        </button>
        <button
          onClick={() => setFilterStatus('attended')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filterStatus === 'attended'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Hadir ({grouped.attended.length})
        </button>
        <button
          onClick={() => setFilterStatus('interview')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filterStatus === 'interview'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Interview ({grouped.interview.length})
        </button>
        <button
          onClick={() => setFilterStatus('member')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filterStatus === 'member'
              ? 'bg-white text-cyan-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Jadi Member ({grouped.member.length})
        </button>
        <button
          onClick={() => setFilterStatus('not_continue')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filterStatus === 'not_continue'
              ? 'bg-white text-gray-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tidak Lanjut ({grouped.not_continue.length})
        </button>
      </div>

      {/* Visitors Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">
            Daftar Visitor - {filterStatus === 'all' ? 'Semua Status' : FINAL_STATUSES[filterStatus as keyof typeof FINAL_STATUSES]?.label || 'Hadir'}
          </h3>
        </div>
        
        {paginatedVisitors.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-gray-500">Belum ada visitor dengan status ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-[11px] text-gray-600 uppercase tracking-wide">
                  <th className="text-left font-semibold px-4 py-3">No</th>
                  <th className="text-left font-semibold px-4 py-3">Nama</th>
                  <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Bidang Usaha</th>
                  <th className="text-left font-semibold px-4 py-3">No WA</th>
                  <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Email</th>
                  <th className="text-left font-semibold px-4 py-3">PIC</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Aksi Cepat</th>
                  <th className="text-left font-semibold px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedVisitors.map((visitor, index) => (
                  <tr key={visitor.id} className={`border-t border-gray-100 hover:bg-gray-50 ${FINAL_STATUSES[visitor.status as keyof typeof FINAL_STATUSES] ? `border-l-4 ${FINAL_STATUSES[visitor.status as keyof typeof FINAL_STATUSES].color}` : ''}`}>
                    <td className="px-4 py-3 text-[13px] text-gray-600 font-medium">{startIndex + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-[13px]">{visitor.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {visitor.meeting_date ? new Date(visitor.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden md:table-cell">
                      {visitor.business_field || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      <a 
                        href={`https://wa.me/${visitor.phone?.replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline"
                      >
                        {visitor.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden lg:table-cell">
                      {visitor.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px]">
                      {visitor.pic_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800">
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                            {visitor.pic_name.charAt(0).toUpperCase()}
                          </span>
                          {visitor.pic_name}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        visitor.status === 'attended' ? 'bg-emerald-100 text-emerald-800' :
                        FINAL_STATUSES[visitor.status as keyof typeof FINAL_STATUSES]?.badge || 'bg-gray-100 text-gray-800'
                      }`}>
                        {visitor.status === 'attended' ? 'Hadir' :
                         FINAL_STATUSES[visitor.status as keyof typeof FINAL_STATUSES]?.label || visitor.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {visitor.status === 'attended' && (
                        <button
                          onClick={() => {
                            setSelectedVisitor(visitor)
                            setShowSubStatusModal(true)
                          }}
                          className="px-3 py-1.5 text-[11px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded transition-colors shadow-sm"
                        >
                          📋 Pilih Tindak Lanjut
                        </button>
                      )}
                      {['interview', 'member', 'not_continue'].includes(visitor.status) && (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOpenDetail(visitor)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Lihat detail"
                      >
                        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Menampilkan <span className="font-medium text-gray-900">{startIndex + 1}</span> - <span className="font-medium text-gray-900">{Math.min(endIndex, filteredVisitors.length)}</span> dari <span className="font-medium text-gray-900">{filteredVisitors.length}</span> data
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-red-600 text-white font-medium'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Cara Menggunakan</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Visitor yang hadir akan muncul di tab <strong>Hadir</strong></li>
              <li>• Gunakan tombol aksi cepat untuk ubah status ke Interview, Member, atau Tidak Lanjut</li>
              <li>• Atau klik detail untuk melihat informasi lengkap dan catatan</li>
              <li>• Status Interview, Member, dan Tidak Lanjut hanya bisa diubah dari halaman ini</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailOpen && selectedVisitor && (
        <VisitorDetail
          visitor={selectedVisitor}
          onClose={handleCloseDetail}
          onEdit={() => handleCloseDetail()}
        />
      )}

      {/* Sub-Status Modal */}
      {showSubStatusModal && selectedVisitor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-gray-900">Tindak Lanjut Visitor</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedVisitor.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowSubStatusModal(false)
                  setSelectedSubStatus(null)
                  setRejectReason('')
                  setInterviewDate('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {!selectedSubStatus ? (
                // Step 1: Pilih sub-status
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Pilih status follow-up untuk visitor ini:</p>
                  
                  <button
                    onClick={() => handleSubStatusSelect('contacted_no_answer')}
                    className="w-full px-4 py-3 bg-yellow-50 hover:bg-yellow-100 border-2 border-yellow-300 text-yellow-800 rounded-xl transition-all text-left font-medium text-sm flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-lg">📞</span>
                    <div>
                      <div>Sudah Dihubungi, Belum Jawab</div>
                      <div className="text-xs text-yellow-600 font-normal mt-0.5">Perlu follow-up lagi</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSubStatusSelect('interview_pending_date')}
                    className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 text-purple-800 rounded-xl transition-all text-left font-medium text-sm flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-lg">📅</span>
                    <div>
                      <div>Akan Interview (Belum Ada Tanggal)</div>
                      <div className="text-xs text-purple-600 font-normal mt-0.5">Menunggu jadwal dari visitor</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSubStatusSelect('interview_scheduled')}
                    className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 text-blue-800 rounded-xl transition-all text-left font-medium text-sm flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-lg">✅</span>
                    <div>
                      <div className="font-semibold text-sm">Sudah Ada Tanggal Interview</div>
                      <div className="text-xs text-blue-600 font-normal mt-0.5">Jadwal sudah fix</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSubStatusSelect('interview_completed_accept')}
                    className="w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-800 rounded-xl transition-all text-left font-medium text-sm flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-lg">✓</span>
                    <div>
                      <div>Interview Selesai - Diterima</div>
                      <div className="text-xs text-emerald-600 font-normal mt-0.5">Siap jadi member</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleSubStatusSelect('interview_completed_reject')}
                    className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-300 text-red-800 rounded-xl transition-all text-left font-medium text-sm flex items-center gap-3"
                  >
                    <span className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-lg">✗</span>
                    <div>
                      <div>Interview Selesai - Tidak Diterima</div>
                      <div className="text-xs text-red-600 font-normal mt-0.5">Perlu alasan penolakan</div>
                    </div>
                  </button>
                </div>
              ) : selectedSubStatus === 'interview_scheduled' ? (
                // Step 2: Input tanggal interview
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-800 bg-blue-50 p-3 rounded-lg">
                    <span className="text-xl">✅</span>
                    <div>
                      <div className="font-semibold text-sm">Sudah Ada Tanggal Interview</div>
                      <div className="text-xs text-blue-600">Masukkan tanggal dan waktu interview</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Interview *
                    </label>
                    <input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setSelectedSubStatus(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={() => {
                        if (!interviewDate) {
                          alert('Tanggal interview harus diisi!')
                          return
                        }
                        const formattedDate = new Date(interviewDate).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        saveSubStatus(selectedSubStatus, formattedDate)
                      }}
                      disabled={!interviewDate}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : selectedSubStatus === 'interview_completed_reject' ? (
                // Step 2: Input alasan penolakan
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-800 bg-red-50 p-3 rounded-lg">
                    <span className="text-xl">✗</span>
                    <div>
                      <div className="font-semibold text-sm">Tidak Diterima</div>
                      <div className="text-xs text-red-600">Berikan alasan penolakan</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alasan Tidak Diterima *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Contoh: Bisnis belum sesuai requirement, komitmen kurang, dll."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setSelectedSubStatus(null)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={() => {
                        if (!rejectReason.trim()) {
                          alert('Alasan penolakan harus diisi!')
                          return
                        }
                        saveSubStatus(selectedSubStatus, rejectReason.trim())
                      }}
                      disabled={!rejectReason.trim()}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                // Confirmation for other sub-status
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Menyimpan...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
