'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/hooks/useData'
import VisitorDetail from './VisitorDetail'

interface VisitorForm {
  name: string
  phone: string
  email: string
  business_field: string
  company: string
  chapter: string
  referral_name: string
  meeting_date: string
  pic_id: string
  status: string
  notes: string
}

const initialForm: VisitorForm = {
  name: '',
  phone: '',
  email: '',
  business_field: '',
  company: '',
  chapter: '',
  referral_name: '',
  meeting_date: '',
  pic_id: '',
  status: 'new',
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
  const { visitors, meetings, pics, loading, reload, addVisitor, updateVisitor, deleteVisitor } = useData()
  
  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [meetingFilter, setMeetingFilter] = useState('')
  const [picFilter, setPicFilter] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null)
  const [formData, setFormData] = useState<VisitorForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const handleOpenAdd = () => {
    setFormData({
      ...initialForm,
      meeting_date: new Date().toISOString().split('T')[0],
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
      referral_name: visitor.referral_name || '',
      meeting_date: visitor.meeting_date || '',
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
        referral_name: formData.referral_name || undefined,
        meeting_date: formData.meeting_date || undefined,
        pic_id: formData.pic_id || undefined,
        status: formData.status,
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

  const getStatusLabel = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.label || status
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
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-600">
                <th className="text-left font-medium px-4 py-3">Nama</th>
                <th className="text-left font-medium px-4 py-3">Bidang Usaha</th>
                <th className="text-left font-medium px-4 py-3">No WA</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Meeting</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">PIC</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
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
                filteredVisitors.map((visitor) => (
                  <tr key={visitor.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{visitor.name}</div>
                      <div className="text-xs text-gray-500 md:hidden">{visitor.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {visitor.business_field || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {visitor.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {visitor.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {visitor.meeting_date ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(visitor.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(visitor.meeting_date).getFullYear()}
                          </div>
                        </div>
                      ) : (
                        visitor.meeting_title || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
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
                        {getStatusLabel(visitor.status)}
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
                    Diajak oleh Member
                  </label>
                  <input
                    type="text"
                    value={formData.referral_name}
                    onChange={(e) => setFormData({ ...formData, referral_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder="Nama member"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Tanggal Meeting
                  </label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
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
