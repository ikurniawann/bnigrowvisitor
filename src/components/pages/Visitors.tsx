'use client'

import { useState, useEffect, useRef } from 'react'
import { useData } from '@/hooks/useData'
import VisitorDetail from './VisitorDetail'

interface VisitorForm {
  name: string
  phone: string
  email: string
  business_field: string
  company: string
  chapter: string
  gender: string
  referred_by_member_id: string
  meeting_id: string
  pic_id: string
  status: string
  attended_choice_number?: number
  attended_choice_note?: string
  notes: string
}

const initialForm: VisitorForm = {
  name: '',
  phone: '',
  email: '',
  business_field: '',
  company: '',
  chapter: '',
  gender: 'Bapak',
  referred_by_member_id: '',
  meeting_id: '',
  pic_id: '',
  status: 'new',
  attended_choice_number: undefined,
  attended_choice_note: '',
  notes: '',
}

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

export default function Visitors() {
  const { visitors, meetings, pics, members, loading, reload, addVisitor, updateVisitor, deleteVisitor } = useData()
  
  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [meetingFilter, setMeetingFilter] = useState('')
  const [picFilter, setPicFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null)
  const [formData, setFormData] = useState<VisitorForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Member search dropdown state
  const [memberSearch, setMemberSearch] = useState('')
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  const memberDropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Filter members for dropdown
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.business_field || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.company || '').toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 10) // Limit 10 results

  // Listen for global "open add visitor" event from topbar button
  useEffect(() => {
    const handleOpenAddVisitor = () => {
      handleOpenAdd()
    }

    window.addEventListener('open-add-visitor', handleOpenAddVisitor)

    return () => {
      window.removeEventListener('open-add-visitor', handleOpenAddVisitor)
    }
  }, [])

  // Filter visitors
  const filteredVisitors = visitors.filter(v => {
    if (search) {
      const s = search.toLowerCase()
      const match = 
        v.name.toLowerCase().includes(s) ||
        v.phone?.includes(s) ||
        v.email?.toLowerCase().includes(s) ||
        v.business_field?.toLowerCase().includes(s) ||
        v.company?.toLowerCase().includes(s)
      if (!match) return false
    }
    if (statusFilter && v.status !== statusFilter) return false
    if (meetingFilter && v.meeting_id !== meetingFilter) return false
    if (picFilter && v.pic_id !== picFilter) return false
    return true
  })

  // Sort visitors
  const sortedVisitors = [...filteredVisitors].sort((a, b) => {
    let comparison = 0
    
    if (sortBy === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else if (sortBy === 'meeting_date') {
      comparison = new Date(a.meeting_date || '1970-01-01').getTime() - new Date(b.meeting_date || '1970-01-01').getTime()
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Pagination
  const totalPages = Math.ceil(sortedVisitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVisitors = sortedVisitors.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, meetingFilter, picFilter, sortBy, sortOrder])

  const handleOpenAdd = () => {
    setFormData({
      ...initialForm,
      meeting_id: meetings.length > 0 ? meetings[0].id : '',
      pic_id: '',
    })
    setEditingId(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (visitor: any) => {
    setFormData({
      name: visitor.name || '',
      phone: visitor.phone || '',
      email: visitor.email || '',
      business_field: visitor.business_field || '',
      company: visitor.company || '',
      chapter: visitor.chapter || '',
      gender: visitor.gender || 'Bapak',
      referred_by_member_id: (visitor as any).referred_by_member_id || '',
      meeting_id: visitor.meeting_id || '',
      pic_id: visitor.pic_id || '',
      status: visitor.status || 'new',
      notes: visitor.notes || '',
    })
    setEditingId(visitor.id)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenDetail = (visitor: any) => {
    setSelectedVisitor(visitor)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedVisitor(null)
  }

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Nama dan No WhatsApp wajib diisi')
      return
    }

    setSaving(true)
    setError('')

    try {
      const data: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        business_field: formData.business_field || undefined,
        company: formData.company || undefined,
        chapter: formData.chapter || undefined,
        gender: formData.gender || undefined,
        referred_by_member_id: formData.referred_by_member_id || undefined,
        meeting_id: formData.meeting_id || undefined,
        pic_id: formData.pic_id || undefined,
        status: formData.status,
        attended_choice_number: formData.attended_choice_number || undefined,
        attended_choice_note: formData.attended_choice_note || undefined,
        notes: formData.notes || undefined,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        await updateVisitor(editingId, data)
      } else {
        data.created_at = new Date().toISOString()
        await addVisitor(data)
      }

      setIsModalOpen(false)
      setFormData(initialForm)
      await reload()
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus visitor ini?')) return

    try {
      await deleteVisitor(id)
      await reload()
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.badge || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string, attendedChoiceNumber?: number) => {
    const baseLabel = STATUSES[status as keyof typeof STATUSES]?.label || status
    
    // If status is 'attended' (Hadir) and has attended_choice_number, append it
    if (status === 'attended' && attendedChoiceNumber) {
      return `${baseLabel}-${attendedChoiceNumber}`
    }
    
    return baseLabel
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
      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, WA, email, bidang usaha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
          >
            <option value="">Semua Status</option>
            {Object.entries(STATUSES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>

          {/* Meeting Filter */}
          <select
            value={meetingFilter}
            onChange={(e) => setMeetingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
          >
            <option value="">Semua Meeting</option>
            {meetings.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>

          {/* PIC Filter */}
          <select
            value={picFilter}
            onChange={(e) => setPicFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
          >
            <option value="">Semua PIC</option>
            {pics.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Sort By */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
            >
              <option value="created_at">Tanggal Input</option>
              <option value="name">Nama</option>
              <option value="meeting_date">Tanggal Meeting</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
        </div>

        {/* Count */}
        <div className="text-sm text-gray-500">
          Menampilkan {filteredVisitors.length} dari {visitors.length} visitor
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-red-600 to-red-700">
              <tr className="text-xs text-white font-bold uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-3">No</th>
                <th className="text-left font-medium px-4 py-3">Nama</th>
                <th className="text-left font-medium px-4 py-3">Gender</th>
                <th className="text-left font-medium px-4 py-3">Bidang Usaha</th>
                <th className="text-left font-medium px-4 py-3">No WA</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Diajak Oleh</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">PIC</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisitors.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <p>Belum ada visitor</p>
                    <button 
                      onClick={handleOpenAdd}
                      className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      + Tambah visitor pertama
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedVisitors.map((visitor, index) => (
                  <tr key={visitor.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[13px] text-gray-600 font-medium">{startIndex + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-[13px]">{visitor.name}</div>
                      <div className="text-xs text-gray-500 md:hidden">{visitor.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {visitor.gender ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          visitor.gender === 'Bapak' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {visitor.gender}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {visitor.business_field || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {visitor.phone}
                    </td>

                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">
                      {(visitor as any).referred_by_member_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">
                            {(visitor as any).referred_by_member_name.charAt(0).toUpperCase()}
                          </span>
                          {(visitor as any).referred_by_member_name}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] hidden md:table-cell">
                      {visitor.pic_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                            {visitor.pic_name.charAt(0).toUpperCase()}
                          </span>
                          {visitor.pic_name}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(visitor.status)}`}>
                        {getStatusLabel(visitor.status, (visitor as any).attended_choice_number)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
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
                        <button
                          onClick={() => handleOpenEdit(visitor)}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(visitor.id)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Hapus"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
          <div className="text-[13px] text-gray-600">
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

      {/* Modal: Add/Edit Visitor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Visitor' : 'Tambah Visitor'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    No WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="0812xxxx"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="email@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Bidang Usaha
                  </label>
                  <input
                    type="text"
                    value={formData.business_field}
                    onChange={(e) => setFormData({ ...formData, business_field: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="Misal: Digital Marketing"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Perusahaan
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="Nama perusahaan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Chapter BNI Grow
                  </label>
                  <input
                    type="text"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="Misal: Grow Jakarta Selatan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
                  >
                    <option value="Bapak">Bapak</option>
                    <option value="Ibu">Ibu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Diajak oleh Member
                  </label>
                  <div ref={memberDropdownRef} className="relative">
                    {formData.referred_by_member_id ? (
                      <div className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-green-50">
                        <div className="flex-1">
                          {members.find(m => m.id === formData.referred_by_member_id)?.name || 'Unknown Member'}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, referred_by_member_id: '' })
                            setMemberSearch('')
                          }}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value)
                          setShowMemberDropdown(true)
                        }}
                        onFocus={() => setShowMemberDropdown(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                        placeholder="Cari nama member..."
                      />
                    )}
                    
                    {showMemberDropdown && memberSearch && filteredMembers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, referred_by_member_id: member.id })
                              setMemberSearch('')
                              setShowMemberDropdown(false)
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                            <div className="text-xs text-gray-500">
                              {member.business_field || '-'}
                              {member.company ? ` • ${member.company}` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {showMemberDropdown && memberSearch && filteredMembers.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-sm text-gray-500">
                        Tidak ada member ditemukan
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Weekly Meeting
                  </label>
                  <select
                    value={formData.meeting_id}
                    onChange={(e) => setFormData({ ...formData, meeting_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">— Pilih Meeting —</option>
                    {meetings.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} - {new Date(m.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    PIC Follow Up
                  </label>
                  <select
                    value={formData.pic_id}
                    onChange={(e) => setFormData({ ...formData, pic_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">— Pilih PIC —</option>
                    {pics.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {Object.entries(STATUSES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Attended Choice - Only show when status is 'attended' (Hadir) */}
                {formData.status === 'attended' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Pilihan Kehadiran *
                    </label>
                    <select
                      value={formData.attended_choice_number || ''}
                      onChange={(e) => {
                        const num = parseInt(e.target.value)
                        let note = ''
                        
                        // Map number to description
                        switch(num) {
                          case 1:
                            note = 'Bersedia di-interview'
                            break
                          case 2:
                            note = 'Masih pikir-pikir'
                            break
                          case 3:
                            note = 'Menolak untuk bergabung'
                            break
                        }
                        
                        setFormData({ 
                          ...formData, 
                          attended_choice_number: num,
                          attended_choice_note: note
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
                      required
                    >
                      <option value="">— Pilih —</option>
                      <option value="1">1 - Bersedia di-interview</option>
                      <option value="2">2 - Masih pikir-pikir</option>
                      <option value="3">3 - Menolak untuk bergabung</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Pilih salah satu opsi</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Catatan tambahan, hasil wawancara, dll..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detail Visitor */}
      {isDetailOpen && selectedVisitor && (
        <VisitorDetail
          visitor={selectedVisitor}
          onClose={handleCloseDetail}
          onEdit={(v) => {
            handleCloseDetail()
            handleOpenEdit(v)
          }}
        />
      )}
    </div>
  )
}
