'use client'

import { useState } from 'react'
import { useData, Member } from '@/hooks/useData'

interface MemberForm {
  name: string
  phone: string
  email: string
  business_field: string
  company: string
  chapter: string
  notes: string
}

const initialForm: MemberForm = {
  name: '',
  phone: '',
  email: '',
  business_field: '',
  company: '',
  chapter: '',
  notes: '',
}

export default function Members() {
  const { members, loading, reload, addMember, updateMember, deleteMember } = useData()
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<MemberForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const handleOpenAdd = () => {
    setFormData(initialForm)
    setEditingId(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (member: Member) => {
    setFormData({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      business_field: member.business_field || '',
      company: member.company || '',
      chapter: member.chapter || '',
      notes: member.notes || '',
    })
    setEditingId(member.id)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Nama wajib diisi!')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateMember(editingId, formData)
      } else {
        await addMember({
          ...formData,
          joined_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
      }
      
      handleCloseModal()
      await reload()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus member "${name}"?`)) return
    
    try {
      await deleteMember(id)
      await reload()
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchSearch = search === '' || 
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      (member.phone || '').includes(search) ||
      (member.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (member.business_field || '').toLowerCase().includes(search.toLowerCase()) ||
      (member.company || '').toLowerCase().includes(search.toLowerCase())
    
    const matchStatus = statusFilter === '' || member.status === statusFilter
    
    return matchSearch && matchStatus
  })

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Member Grow</h1>
          <p className="text-sm text-gray-500 mt-1">Database member BNI Grow yang sudah bergabung</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-lg shadow transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-emerald-500">
          <div className="text-3xl font-bold text-emerald-600">{members.filter(m => m.status === 'active').length}</div>
          <div className="text-xs text-gray-500 mt-1">Member Aktif</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-gray-500">
          <div className="text-3xl font-bold text-gray-600">{members.filter(m => m.status === 'inactive').length}</div>
          <div className="text-xs text-gray-500 mt-1">Member Tidak Aktif</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-600">{members.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Member</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari nama, HP, email, perusahaan..."
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
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          Menampilkan {filteredMembers.length} dari {members.length} member
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-[11px] text-gray-600 uppercase tracking-wide">
                <th className="text-left font-semibold px-4 py-3">No</th>
                <th className="text-left font-semibold px-4 py-3">Nama</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">No WhatsApp</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Email</th>
                <th className="text-left font-semibold px-4 py-3 hidden xl:table-cell">Perusahaan</th>
                <th className="text-left font-semibold px-4 py-3 hidden xl:table-cell">Chapter</th>
                <th className="text-left font-semibold px-4 py-3">Tanggal Gabung</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <p>Belum ada member</p>
                    <button 
                      onClick={handleOpenAdd}
                      className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      + Tambah member pertama
                    </button>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => (
                  <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[13px] text-gray-600 font-medium">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-[13px]">{member.name}</div>
                      {member.business_field && (
                        <div className="text-xs text-gray-500 mt-0.5">{member.business_field}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden md:table-cell">
                      {member.phone ? (
                        <a 
                          href={`https://wa.me/${member.phone.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden lg:table-cell">
                      {member.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden xl:table-cell">
                      {member.company || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden xl:table-cell">
                      {member.chapter || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {member.joined_date 
                        ? new Date(member.joined_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        member.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        member.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {member.status === 'active' ? 'Aktif' :
                         member.status === 'inactive' ? 'Tidak Aktif' :
                         'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(member.id, member.name)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Hapus"
                        >
                          <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingId ? 'Edit Member' : 'Tambah Member Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId ? 'Update data member' : 'Isi data member yang akan ditambahkan'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                  placeholder="Contoh: Ahmad Santoso"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                  placeholder="0812xxxx (optional)"
                />
                <p className="text-[10px] text-gray-500 mt-1">Nomor HP tidak wajib diisi</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Chapter
                  </label>
                  <input
                    type="text"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                    placeholder="Contoh: Jakarta Barat"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Bidang Usaha
                  </label>
                  <input
                    type="text"
                    value={formData.business_field}
                    onChange={(e) => setFormData({ ...formData, business_field: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                    placeholder="Contoh: Consulting"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                    placeholder="Contoh: PT Santoso Jaya"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500 resize-none"
                  placeholder="Catatan tambahan (optional)"
                />
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  {saving ? 'Menyimpan...' : (editingId ? 'Update' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
