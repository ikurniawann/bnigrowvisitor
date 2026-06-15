'use client'

import { useState, useEffect } from 'react'
import { useData, Member } from '@/hooks/useData'
import { User } from '@/lib/supabase'
import { apiSend } from '@/lib/dataClient'
import { getUserLevelLabel, isNationalAdmin } from '@/lib/permissions'
import { useChapterBranding } from '@/hooks/useChapterBranding'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { parseBniMembersReport, ParsedMember } from '@/lib/importBniMembers'

interface MemberForm {
  name: string
  phone: string
  email: string
  password: string
  business_field: string
  company: string
  chapter: string
  renewal_date: string
  notes: string
}

const initialForm: MemberForm = {
  name: '',
  phone: '',
  email: '',
  password: '',
  business_field: '',
  company: '',
  chapter: '',
  renewal_date: '',
  notes: '',
}

export default function Members() {
  const { members, loading, reload, addMember, updateMember, deleteMember } = useData()
  const chapterBranding = useChapterBranding()
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingEmail, setEditingEmail] = useState('')
  const [formData, setFormData] = useState<MemberForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Excel import
  const [showImport, setShowImport] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([])
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; total: number } | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const isSuperAdmin = isNationalAdmin(currentUser) || currentUser?.role === 'chapter_admin'
  const accessLabel = getUserLevelLabel(currentUser)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      setCurrentUser(storedUser ? JSON.parse(storedUser) : null)
    } catch {
      setCurrentUser(null)
    }
  }, [])

  const isOwnMember = (member: Member) => {
    if (!currentUser) return false

    const userEmail = currentUser.email?.trim().toLowerCase()
    const memberEmail = member.email?.trim().toLowerCase()

    if (userEmail && memberEmail && userEmail === memberEmail) return true
    return !memberEmail && member.name.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()
  }

  const canEditMember = (member: Member) => isSuperAdmin || isOwnMember(member)

  const handleOpenImport = () => {
    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang bisa import member.')
      return
    }
    setParsedMembers([])
    setParseError('')
    setImportResult(null)
    setImportFileName('')
    setShowImport(true)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setParseError('')
    setImportResult(null)
    setImportFileName(file.name)
    try {
      const buffer = await file.arrayBuffer()
      const { members } = parseBniMembersReport(buffer)
      if (members.length === 0) throw new Error('Tidak ada baris member yang terbaca dari file.')
      setParsedMembers(members)
    } catch (err: any) {
      setParsedMembers([])
      setParseError(err?.message || 'Gagal membaca file.')
    }
  }

  const handleConfirmImport = async () => {
    if (parsedMembers.length === 0) return
    setImporting(true)
    setParseError('')
    try {
      const result = await apiSend<{ imported: number; duplicates: number; total: number }>(
        'members/bulk-import',
        'POST',
        { members: parsedMembers }
      )
      setImportResult(result)
      await reload()
    } catch (err: any) {
      setParseError(err?.message || 'Gagal mengimpor data.')
    } finally {
      setImporting(false)
    }
  }

  const handleOpenAdd = () => {
    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang bisa menambahkan member.')
      return
    }

    setFormData({
      ...initialForm,
      chapter: chapterBranding.displayName,
    })
    setEditingId(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (member: Member) => {
    if (!canEditMember(member)) {
      alert('PIC hanya bisa mengubah data member miliknya sendiri.')
      return
    }

    setFormData({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      password: '',
      business_field: member.business_field || '',
      company: member.company || '',
      chapter: member.chapter || '',
      renewal_date: member.renewal_date || '',
      notes: member.notes || '',
    })
    setEditingId(member.id)
    setEditingEmail(member.email || '')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setEditingEmail('')
    setFormData(initialForm)
  }

  // Account creation / password reset is enforced server-side: chapter,
  // organization, role preservation, and cross-chapter / admin-email guards all
  // live in the scoped sync-member route. The client only forwards intent.
  const syncMemberAccount = async (member: MemberForm, previousEmail?: string) => {
    const email = member.email.trim()
    if (!email) return

    await apiSend('accounts/sync-member', 'POST', {
      name: member.name,
      email,
      phone: member.phone,
      oldEmail: previousEmail,
      password: member.password.trim() || undefined,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Nama wajib diisi!')
      return
    }

    if (formData.password.trim() && !formData.email.trim()) {
      alert('Email wajib diisi untuk membuat akun login member!')
      return
    }

    if (!isSuperAdmin && formData.password.trim()) {
      alert('PIC tidak bisa mengubah password akun.')
      return
    }

    setSaving(true)
    try {
      const currentMember = editingId ? members.find(member => member.id === editingId) : undefined

      if (!isSuperAdmin) {
        if (!editingId || !currentMember || !isOwnMember(currentMember)) {
          throw new Error('PIC hanya bisa mengubah data member miliknya sendiri.')
        }
      }

      const memberPayload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        business_field: formData.business_field,
        company: formData.company,
        chapter: formData.chapter,
        renewal_date: formData.renewal_date.trim() || null,
        notes: formData.notes,
      }

      if (editingId) {
        await updateMember(editingId, memberPayload)
        if (isSuperAdmin) {
          await syncMemberAccount(formData, editingEmail)
        }
      } else {
        if (!isSuperAdmin) {
          throw new Error('Hanya Super Admin yang bisa menambahkan member.')
        }

        await addMember({
          ...memberPayload,
          joined_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        await syncMemberAccount(formData)
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
    if (!isSuperAdmin) {
      alert('Hanya Super Admin yang bisa menghapus member.')
      return
    }

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

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  if (loading) {
    return (
      <div className="space-y-4 fade-in-up">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded-xl bg-gray-200/80 animate-pulse" />
          <div className="h-8 w-28 rounded-xl bg-gray-200/80 animate-pulse" />
        </div>
        <TableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Member {chapterBranding.shortName}</h1>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isSuperAdmin ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {accessLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin
              ? `Database member ${chapterBranding.chapterName} yang sudah bergabung`
              : 'Akses PIC: hanya bisa mengubah data member milik akun sendiri'}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenImport}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Import Excel
            </button>
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
        )}
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

        {/* Mobile: card view */}
        <div className="sm:hidden divide-y divide-gray-100">
          {paginatedMembers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="text-sm">Belum ada member</p>
              <button onClick={handleOpenAdd} disabled={!isSuperAdmin} className="mt-3 text-red-600 text-sm font-medium">
                + Tambah member pertama
              </button>
            </div>
          ) : paginatedMembers.map((member, index) => (
            <div key={member.id} className="p-4">
              {/* Row 1: nama + status */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
                  {member.phone && <p className="text-xs text-gray-500 mt-0.5">{member.phone}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    member.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                    member.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {member.status === 'active' ? 'Aktif' : member.status === 'inactive' ? 'Tidak Aktif' : 'Suspended'}
                  </span>
                  <span className="text-xs text-gray-400">#{index + 1}</span>
                </div>
              </div>

              {/* Row 2: bidang usaha + perusahaan */}
              {(member.business_field || member.company) && (
                <p className="text-xs text-gray-600 mb-1.5 truncate">
                  {member.business_field}{member.company ? ` • ${member.company}` : ''}
                </p>
              )}

              {/* Row 3: email + akun */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-600 truncate">{member.email || 'Belum ada email'}</p>
                <span className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  member.account_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {member.account_active
                    ? `Akun ${getUserLevelLabel({ role: member.account_role as any, email: member.email || '' })}`
                    : 'Belum ada akun'}
                </span>
              </div>

              {/* Row 4: actions */}
              <div className="flex gap-2">
                {canEditMember(member) ? (
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 self-center">Terkunci</span>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(member.id, member.name)}
                    className="flex items-center justify-center rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-red-600 to-red-700">
              <tr className="text-[11px] text-white font-bold uppercase tracking-wide">
                <th className="text-left font-semibold px-4 py-3">No</th>
                <th className="text-left font-semibold px-4 py-3">Nama</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Email / Akun</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Bidang Usaha</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Perusahaan</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <p>Belum ada member</p>
                    <button 
                      onClick={handleOpenAdd}
                      disabled={!isSuperAdmin}
                      className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      + Tambah member pertama
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member, index) => (
                  <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[13px] text-gray-600 font-medium">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-[13px]">{member.name}</div>
                      {member.phone && (
                        <div className="text-xs text-gray-500 mt-0.5">{member.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-[13px] text-gray-700">{member.email || '-'}</div>
                      <div className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        member.account_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.account_active
                          ? `Akun ${getUserLevelLabel({ role: member.account_role as any, email: member.email || '' })}`
                          : 'Belum ada akun'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden md:table-cell">
                      {member.business_field || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 hidden lg:table-cell">
                      {member.company || '-'}
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
                        {canEditMember(member) ? (
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
                        ) : (
                          <span className="text-[11px] font-medium text-gray-400">Terkunci</span>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(member.id, member.name)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
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
            Menampilkan <span className="font-medium text-gray-900">{startIndex + 1}</span> - <span className="font-medium text-gray-900">{Math.min(endIndex, filteredMembers.length)}</span> dari <span className="font-medium text-gray-900">{filteredMembers.length}</span> data
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

      {/* Import Excel Modal */}
      {showImport && (
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-spring-enter bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-gray-900">Import Member dari Excel</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Format: BNI Chapter Membership Dues Report (.xls/.xlsx). Target chapter:{' '}
                  <span className="font-semibold text-gray-700">{chapterBranding.displayName}</span>
                </p>
              </div>
              <button onClick={() => setShowImport(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {importResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-bold">Import selesai ✓</p>
                  <ul className="mt-2 space-y-0.5 text-emerald-700">
                    <li>• Berhasil ditambahkan: <b>{importResult.imported}</b> member</li>
                    <li>• Dilewati (duplikat nama): <b>{importResult.duplicates}</b></li>
                    <li>• Total baris dibaca: <b>{importResult.total}</b></li>
                  </ul>
                </div>
              ) : (
                <>
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 cursor-pointer hover:border-red-300 hover:bg-red-50/40 transition">
                    <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{importFileName || 'Pilih file Excel (.xls / .xlsx)'}</span>
                    <span className="text-[11px] text-gray-400">Klik untuk memilih file</span>
                    <input type="file" accept=".xls,.xlsx" onChange={handleImportFile} className="hidden" />
                  </label>

                  {parseError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{parseError}</div>
                  )}

                  {parsedMembers.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">Pratinjau: {parsedMembers.length} member terbaca</p>
                        <p className="text-[11px] text-gray-400">company/phone/email tidak ada di report ini</p>
                      </div>
                      <div className="max-h-64 overflow-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                              <th className="px-3 py-2 font-semibold">Nama</th>
                              <th className="px-3 py-2 font-semibold">Bidang</th>
                              <th className="px-3 py-2 font-semibold">Status</th>
                              <th className="px-3 py-2 font-semibold">Renewal</th>
                              <th className="px-3 py-2 font-semibold">Peran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedMembers.slice(0, 100).map((m, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="px-3 py-1.5 font-medium text-gray-800">{m.name}</td>
                                <td className="px-3 py-1.5 text-gray-600">{m.business_field || '—'}</td>
                                <td className="px-3 py-1.5 text-gray-600">{m.status}</td>
                                <td className="px-3 py-1.5 text-gray-600">{m.renewal_date || '—'}</td>
                                <td className="px-3 py-1.5 text-gray-500">{m.role || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedMembers.length > 100 && (
                        <p className="mt-1 text-[11px] text-gray-400">Menampilkan 100 baris pertama dari {parsedMembers.length}.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {importResult ? 'Tutup' : 'Batal'}
              </button>
              {!importResult && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || parsedMembers.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  {importing ? 'Mengimpor…' : `Import ${parsedMembers.length || ''} Member`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-spring-enter bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    Email Login
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isSuperAdmin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                    placeholder="email@example.com"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    {isSuperAdmin ? 'Email ini dipakai untuk login member.' : 'Email login hanya bisa diubah oleh Super Admin.'}
                  </p>
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

              {isSuperAdmin ? (
                <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-bold text-gray-900">Akun Login Member</div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Isi password untuk membuat akun baru atau reset password member.
                    </p>
                  </div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Password Login {editingId ? '(optional)' : ''}
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500 bg-white"
                    placeholder={editingId ? 'Kosongkan jika tidak reset password' : 'Contoh: member123'}
                  />
                  <div className="mt-2 flex items-start gap-2 text-[11px] text-gray-600">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span>
                      Kalau email sudah dipakai akun PIC/admin, sistem akan update data dan password tanpa mengubah role akun tersebut.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                  Akses PIC tidak bisa mengubah password akun. Hubungi Super Admin untuk reset password.
                </div>
              )}

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
                  Tanggal Renewal
                </label>
                <input
                  type="date"
                  value={formData.renewal_date}
                  onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Tanggal kirim invoice perpanjangan. Lewat tanggal ini tanpa perpanjangan, member otomatis dinonaktifkan.
                </p>
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
