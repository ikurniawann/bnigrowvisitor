'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { notifyDataChanged } from '@/lib/ui/toast'
import { saveLocalPicBusinessClassification } from '@/lib/picBusinessClassification'

interface PICForm {
  member_id: string
  name: string
  role: string
  wa: string
  business_classification: string
  email: string
}

const initialForm: PICForm = {
  member_id: '',
  name: '',
  role: 'Visitor Followup Specialist',
  wa: '',
  business_classification: '',
  email: '',
}

export default function PICManagement() {
  const { pics, visitors, members, loading, reload, updatePic, deletePic } = useData()
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PICForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')

  // Calculate workload for each PIC
  const getPICWorkload = (picId: string) => {
    const picVisitors = visitors.filter(v => v.pic_id === picId)
    const active = picVisitors.filter(v => !['member', 'not_continue'].includes(v.status)).length
    return {
      total: picVisitors.length,
      active,
    }
  }

  const availableMembers = members
    .filter(member => member.status !== 'inactive')
    .filter(member => {
      const memberEmail = (member.email || '').trim().toLowerCase()
      const memberName = member.name.trim().toLowerCase()

      return !pics.some(pic => {
        const picEmail = (pic.email || '').trim().toLowerCase()
        const picName = pic.name.trim().toLowerCase()
        return (memberEmail && picEmail === memberEmail) || picName === memberName
      })
    })

  const selectedMember = members.find(member => member.id === formData.member_id)
  const memberSuggestions = memberSearch.trim().length >= 3
    ? availableMembers
        .filter(member => {
          const keyword = memberSearch.trim().toLowerCase()
          return (
            member.name.toLowerCase().includes(keyword) ||
            (member.phone || '').toLowerCase().includes(keyword) ||
            (member.email || '').toLowerCase().includes(keyword) ||
            (member.business_field || '').toLowerCase().includes(keyword) ||
            (member.company || '').toLowerCase().includes(keyword)
          )
        })
        .slice(0, 8)
    : []

  const handleSelectMember = (member: typeof members[number]) => {
    setMemberSearch(member.name)
    setFormData({
      ...formData,
      member_id: member.id,
      name: member.name || '',
      wa: member.phone || '',
      email: member.email || '',
      business_classification: member.business_field || '',
    })
  }

  const handleOpenAdd = () => {
    setFormData(initialForm)
    setMemberSearch('')
    setEditingId(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (pic: any) => {
    setFormData({
      name: pic.name || '',
      role: pic.role || 'Visitor Followup Specialist',
      wa: pic.wa || '',
      business_classification: pic.business_classification || '',
      email: '', // Email tidak bisa diubah
      member_id: '',
    })
    setMemberSearch('')
    setEditingId(pic.id)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingId && !selectedMember) {
      setError('Pilih member yang akan dijadikan PIC')
      return
    }

    if (!formData.name.trim()) {
      setError('Nama PIC wajib diisi')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingId) {
        saveLocalPicBusinessClassification(editingId, formData.business_classification)
        // Update existing PIC
        await updatePic(editingId, {
          name: formData.name,
          role: formData.role,
          wa: formData.wa,
          business_classification: formData.business_classification,
        })
      } else {
        const memberForPic = selectedMember
        if (!memberForPic) {
          setError('Pilih member yang akan dijadikan PIC')
          setSaving(false)
          return
        }

        const memberEmail = (memberForPic.email || '').trim()
        const generatedEmail = `member+${memberForPic.id}@bnigrow.com`
        const picEmail = memberEmail || generatedEmail
        const picPayload = {
          name: memberForPic.name,
          email: picEmail,
          password_hash: 'temp',
          role: 'pic',
          phone: memberForPic.phone || '',
          business_classification: formData.business_classification || memberForPic.business_field || '',
          is_active: true,
        }

        const existingUser = await supabase
          .from('users')
          .select('id, role, name')
          .eq('email', picEmail)
          .maybeSingle()

        if (existingUser.error) throw existingUser.error
        if (existingUser.data?.role === 'admin') {
          setError(`Email ${picEmail} sudah dipakai akun admin (${existingUser.data.name}). Gunakan member lain atau ubah data email member terlebih dahulu.`)
          setSaving(false)
          return
        }

        let insertedPic: any | null = null
        let insertError: any = null

        if (existingUser.data?.id) {
          let updateResult = await supabase
            .from('users')
            .update(picPayload)
            .eq('id', existingUser.data.id)
            .select('id')
            .single()

          if (updateResult.error && updateResult.error.message?.includes('business_classification')) {
            updateResult = await supabase
              .from('users')
              .update({
                name: picPayload.name,
                email: picPayload.email,
                password_hash: picPayload.password_hash,
                role: picPayload.role,
                phone: picPayload.phone,
                is_active: picPayload.is_active,
              })
              .eq('id', existingUser.data.id)
              .select('id')
              .single()
          }

          insertedPic = updateResult.data
          insertError = updateResult.error
        } else {
          const insertResult = await supabase
            .from('users')
            .insert(picPayload)
            .select('id')
            .single()

          insertedPic = insertResult.data
          insertError = insertResult.error

          if (insertError && insertError.message?.includes('business_classification')) {
            const fallback = await supabase
              .from('users')
              .insert({
                name: picPayload.name,
                email: picPayload.email,
                password_hash: picPayload.password_hash,
                role: picPayload.role,
                phone: picPayload.phone,
                is_active: picPayload.is_active,
              })
              .select('id')
              .single()

            insertedPic = fallback.data
            insertError = fallback.error
          }
        }

        if (insertError) throw insertError
        if (insertedPic?.id) {
          saveLocalPicBusinessClassification(insertedPic.id, picPayload.business_classification)
        }
        notifyDataChanged('insert')
      }

      setIsModalOpen(false)
      setFormData(initialForm)
      setMemberSearch('')
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
                  <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Klasifikasi Bisnis</th>
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
                      <td className="px-4 py-3 text-[13px] text-gray-600 hidden lg:table-cell">
                        {pic.business_classification || '-'}
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
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit PIC' : 'Tambah PIC dari Member'}
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

              {!editingId && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Pilih Member *
                  </label>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      setMemberSearch(value)
                      setFormData({
                        ...formData,
                        member_id: '',
                        name: '',
                        wa: '',
                        email: '',
                        business_classification: '',
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                    placeholder="Ketik minimal 3 huruf nama member..."
                    autoFocus
                  />

                  {memberSearch.trim().length > 0 && memberSearch.trim().length < 3 && (
                    <p className="text-[10px] text-gray-500 mt-1">Ketik minimal 3 huruf untuk menampilkan suggestion.</p>
                  )}

                  {memberSearch.trim().length >= 3 && memberSuggestions.length > 0 && !formData.member_id && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                      {memberSuggestions.map(member => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectMember(member)}
                          className="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-red-50"
                        >
                          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-900">{member.name}</span>
                            <span className="block truncate text-xs text-gray-500">
                              {[member.business_field, member.company, member.phone].filter(Boolean).join(' - ') || 'Data member'}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {memberSearch.trim().length >= 3 && memberSuggestions.length === 0 && !formData.member_id && (
                    <div className="mt-1 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      Tidak ada member yang cocok atau member sudah menjadi PIC.
                    </div>
                  )}

                  {selectedMember && (
                    <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Terpilih: {selectedMember.name}
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500 mt-1">PIC dibuat dari data Member Grow yang sudah ada.</p>
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
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Pilih member terlebih dahulu"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
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
                  disabled={!editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="0812xxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Klasifikasi Bisnis
                </label>
                <input
                  type="text"
                  value={formData.business_classification}
                  onChange={(e) => setFormData({ ...formData, business_classification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                  placeholder="Contoh: Digital Marketing"
                />
                <p className="text-[10px] text-gray-500 mt-1">Dipakai sebagai placeholder {'{pic_bisnis}'} pada format WA</p>
              </div>

              {!editingId && (
                <div className="rounded-xl border border-red-100 bg-red-50/70 p-3">
                  <div className="text-xs font-semibold text-red-800">Data login mengikuti data member</div>
                  <div className="mt-1 text-xs text-red-700">
                    Email: {selectedMember?.email || 'Akan dibuat otomatis karena member belum punya email'}
                  </div>
                </div>
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
