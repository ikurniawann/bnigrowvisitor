'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'

interface PICForm {
  name: string
  role: string
  wa: string
  email: string
  password: string
}

const initialForm: PICForm = {
  name: '',
  role: 'Visitor Followup Specialist',
  wa: '',
  email: '',
  password: 'pic123',
}

export default function PICManagement() {
  const { pics, visitors, loading, reload, updatePic, deletePic } = useData()
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PICForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Calculate workload for each PIC
  const getPICWorkload = (picId: string) => {
    const picVisitors = visitors.filter(v => v.pic_id === picId)
    const active = picVisitors.filter(v => !['member', 'tidak_lanjut'].includes(v.status)).length
    return {
      total: picVisitors.length,
      active,
    }
  }

  const handleOpenAdd = () => {
    setFormData({
      ...initialForm,
      email: `pic${Date.now()}@bnigrow.com`,
    })
    setEditingId(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (pic: any) => {
    setFormData({
      name: pic.name || '',
      role: pic.role || 'Visitor Followup Specialist',
      wa: pic.wa || '',
      email: '', // Email tidak bisa diubah
      password: '',
    })
    setEditingId(pic.id)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nama PIC wajib diisi')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingId) {
        // Update existing PIC
        await updatePic(editingId, {
          name: formData.name,
          role: formData.role,
          wa: formData.wa,
        })
      } else {
        // Create new PIC with user account
        if (!formData.email.trim() || !formData.password.trim()) {
          setError('Email dan password wajib diisi untuk PIC baru')
          setSaving(false)
          return
        }

        // Create user in database
        await supabase
          .from('users')
          .insert({
            name: formData.name,
            email: formData.email,
            password_hash: formData.password,
            role: 'pic',
            phone: formData.wa,
            is_active: true,
          })
          .single()

        if (userError) throw userError
      }

      setIsModalOpen(false)
      setFormData(initialForm)
      await reload()
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Gagal menyimpan data PIC')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (picId: string) => {
    const workload = getPICWorkload(picId)
    
    if (workload.active > 0) {
      if (!confirm(`PIC ini masih memiliki ${workload.active} visitor aktif. Yakin ingin menghapus? Visitor akan menjadi unassigned.`)) {
        return
      }
    } else {
      if (!confirm('Yakin ingin menghapus PIC ini?')) {
        return
      }
    }

    setDeletingId(picId)
    try {
      // Soft delete: set is_active = false
      await deletePic(picId)
      await reload()
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message)
    } finally {
      setDeletingId(null)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola PIC</h1>
          <p className="text-sm text-gray-500 mt-1">Manage PIC dan akun user mereka</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-xl shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah PIC
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-gray-900">{pics.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total PIC</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-green-600">
            {pics.filter(p => p.is_active !== false).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">PIC Aktif</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-3xl font-bold text-blue-600">{visitors.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Visitor</div>
        </div>
      </div>

      {/* PIC Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Daftar PIC</h3>
        </div>
        
        {pics.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-gray-500 mb-4">Belum ada PIC</p>
            <button
              onClick={handleOpenAdd}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              + Tambah PIC pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-[11px] text-gray-600 uppercase tracking-wide">
                  <th className="text-left font-semibold px-4 py-3">Nama PIC</th>
                  <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Role / Jabatan</th>
                  <th className="text-left font-semibold px-4 py-3">No WhatsApp</th>
                  <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Visitor Aktif</th>
                  <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Total Handled</th>
                  <th className="text-left font-semibold px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pics.map((pic) => {
                  const workload = getPICWorkload(pic.id)
                  const isActive = pic.is_active !== false
                  
                  return (
                    <tr key={pic.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {pic.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-[13px]">{pic.name}</div>
                            {!isActive && (
                              <div className="text-xs text-red-500">Non-aktif</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600 hidden md:table-cell">
                        {pic.role || 'Visitor Followup Specialist'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600">
                        <a 
                          href={`https://wa.me/${pic.wa?.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          {pic.wa || '-'}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-[13px] hidden lg:table-cell">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {workload.active} visitor
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600 hidden lg:table-cell">
                        {workload.total} visitor
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(pic)}
                            disabled={deletingId === pic.id}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Edit"
                          >
                            <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(pic.id)}
                            disabled={deletingId === pic.id}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Hapus"
                          >
                            {deletingId === pic.id ? (
                              <svg className="w-[14px] h-[14px] animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workload Chart */}
      {pics.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Beban Kerja PIC</h3>
          <div className="space-y-3">
            {pics.map((pic) => {
              const workload = getPICWorkload(pic.id)
              const maxActive = Math.max(...pics.map(p => getPICWorkload(p.id).active), 1)
              const percentage = (workload.active / maxActive) * 100
              
              return (
                <div key={pic.id} className="flex items-center gap-3">
                  <div className="w-32 text-[13px] text-gray-700 truncate">{pic.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-[13px] font-medium text-gray-900">
                    {workload.active}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit PIC */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit PIC' : 'Tambah PIC Baru'}
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

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder="Contoh: Ilham Ramadhan"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Role / Jabatan
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder="Visitor Followup Specialist"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  No WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.wa}
                  onChange={(e) => setFormData({ ...formData, wa: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder="0812xxxx"
                />
              </div>

              {!editingId && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Email Login *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                      placeholder="pic@bnigrow.com"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Email untuk login ke sistem</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Password Default *
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                      placeholder="pic123"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Password awal, bisa diubah setelah login</p>
                  </div>
                </>
              )}

              {editingId && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ℹ️ Email dan password tidak dapat diubah. Untuk reset password, hubungi administrator.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
