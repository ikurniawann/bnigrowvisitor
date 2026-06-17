'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useData } from '@/hooks/useData'
import dynamic from 'next/dynamic'
import EmptyState, { VisitorEmptyIcon, SearchEmptyIcon } from '@/components/ui/EmptyState'

const VisitorDetail = dynamic(() => import('./VisitorDetail'), { ssr: false, loading: () => null })
import { TableSkeleton } from '@/components/ui/Skeleton'
import { getWaTemplateSettings, renderWaTemplate } from '@/lib/waTemplate'
import { useChapterBranding } from '@/hooks/useChapterBranding'

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
  const chapterBranding = useChapterBranding()
  
  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [meetingFilter, setMeetingFilter] = useState('')
  const [picFilter, setPicFilter] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkPicId, setBulkPicId] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null)
  const [formData, setFormData] = useState<VisitorForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Visitor frequency warning modal
  const [freqWarning, setFreqWarning] = useState<{
    visitor: any
    pendingStatus: string
    count: number
    limit: number
    periodMonths: number
    visits: any[]
  } | null>(null)

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

  // Filter visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter(v => {
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
  }, [visitors, search, statusFilter, meetingFilter, picFilter])

  // Sort visitors
  const sortedVisitors = useMemo(() => {
    return [...filteredVisitors].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [filteredVisitors])

  // Pagination
  const totalPages = Math.ceil(sortedVisitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVisitors = useMemo(() => sortedVisitors.slice(startIndex, endIndex), [sortedVisitors, startIndex, endIndex])
  const selectedVisitors = useMemo(() => sortedVisitors.filter(visitor => selectedIds.has(visitor.id)), [sortedVisitors, selectedIds])
  const allPageSelected = paginatedVisitors.length > 0 && paginatedVisitors.every(visitor => selectedIds.has(visitor.id))

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, meetingFilter, picFilter])

  const handleOpenAdd = useCallback(() => {
    setFormData({
      ...initialForm,
      chapter: chapterBranding.displayName,
      meeting_id: meetings.length > 0 ? meetings[0].id : '',
      pic_id: '',
    })
    setEditingId(null)
    setError('')
    setIsModalOpen(true)
  }, [chapterBranding.displayName, meetings])

  // Listen for global "open add visitor" event from topbar button
  useEffect(() => {
    const handleOpenAddVisitor = () => {
      handleOpenAdd()
    }

    window.addEventListener('open-add-visitor', handleOpenAddVisitor)

    return () => {
      window.removeEventListener('open-add-visitor', handleOpenAddVisitor)
    }
  }, [handleOpenAdd])

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

  const exportVisitorsCSV = (dataToExport: typeof visitors, filenameSuffix = meetingFilter || 'All') => {
    const headers = ['No', 'Nama', 'Gender', 'No WhatsApp', 'Email', 'Bidang Usaha', 'Perusahaan', 'Chapter', 'Diajak Oleh', 'PIC', 'Status', 'Tanggal Meeting', 'Meeting', 'Catatan']
    
    const rows = dataToExport.map((v, index) => [
      index + 1,
      `"${v.name}"`,
      v.gender || '-',
      `"${v.phone}"`,
      `"${v.email || '-'}"`,
      `"${v.business_field || '-'}"`,
      `"${v.company || '-'}"`,
      `"${v.chapter || '-'}"`,
      `"${(v as any).referred_by_member_name || '-'}"`,
      `"${(v as any).pic_name || '-'}"`,
      STATUSES[v.status as keyof typeof STATUSES]?.label || v.status,
      (v as any).meeting_date || '-',
      `"${(v as any).meeting_title || '-'}"`,
      `"${v.notes || '-'}"`
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Visitor_Export_${filenameSuffix}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportCSV = () => {
    exportVisitorsCSV(meetingFilter ? sortedVisitors : paginatedVisitors)
  }

  const getStatusBadgeClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.badge || 'bg-gray-100 text-gray-800'
  }

  const getStatusOptionStyle = (status: string) => {
    const styles: Record<string, { backgroundColor: string; color: string }> = {
      new: { backgroundColor: '#dbeafe', color: '#1e40af' },
      followup: { backgroundColor: '#fef3c7', color: '#92400e' },
      confirmed: { backgroundColor: '#ffedd5', color: '#9a3412' },
      attended: { backgroundColor: '#d1fae5', color: '#065f46' },
      no_show: { backgroundColor: '#fee2e2', color: '#991b1b' },
      interview: { backgroundColor: '#ede9fe', color: '#5b21b6' },
      member: { backgroundColor: '#ccfbf1', color: '#0f766e' },
      not_continue: { backgroundColor: '#f3f4f6', color: '#374151' },
    }

    return styles[status] || { backgroundColor: '#f3f4f6', color: '#374151' }
  }

  const getStatusLabel = (status: string, attendedChoiceNumber?: number) => {
    const baseLabel = STATUSES[status as keyof typeof STATUSES]?.label || status
    
    if (status === 'attended' && attendedChoiceNumber) {
      const airtimeLabels: Record<number, string> = {
        1: 'Airtime: Bersedia Bergabung',
        2: 'Airtime: Pikir-pikir Dulu',
        3: 'Airtime: Tidak Tertarik',
      }
      return airtimeLabels[attendedChoiceNumber] || baseLabel
    }
    
    return baseLabel
  }

  const getMeetingDateText = (visitor: any) => {
    const rawDate = visitor.meeting_date || visitor.meeting?.meeting_date
    const date = rawDate ? new Date(rawDate) : new Date()
    if (!rawDate) date.setDate(date.getDate() + 1)

    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const buildWaLink = (visitor: any) => {
    const clean = (visitor.phone || '').replace(/[^0-9]/g, '')
    const waNumber = clean.startsWith('0') ? `62${clean.slice(1)}` : clean.startsWith('62') ? clean : `62${clean}`
    const settings = getWaTemplateSettings()
    const sapaan = visitor.gender === 'Ibu' ? 'Ibu' : 'Bapak'
    const template = settings.templates[settings.activeMode]
    const confirmLink = `${window.location.origin}/wm/${visitor.id}`
    const message = renderWaTemplate(template, {
      sapaan,
      nama: visitor.name,
      pic: visitor.pic_name || '[PIC]',
      pic_nama: visitor.pic_name || '[PIC]',
      pic_bisnis: visitor.pic_business_classification || '[Bisnis PIC]',
      diajak_oleh: visitor.referred_by_member_name || visitor.referral_name || '[Diajak Oleh]',
      tanggal_meeting: getMeetingDateText(visitor),
      jam_meeting: '07.30 - 10.15',
      chapter: visitor.chapter || chapterBranding.displayName,
      bidang_usaha: visitor.business_field || '',
      perusahaan: visitor.company || '',
      link_hadir: confirmLink,
    })

    return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
  }

  const trackWaActivity = async (visitor: any) => {
    const timestamp = new Date().toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const currentNotes = visitor.notes || ''
    const note = `[${timestamp}] Template WA dibuka dari tabel visitor\n`

    try {
      await updateVisitor(visitor.id, {
        notes: currentNotes + note,
        updated_at: new Date().toISOString(),
      })
      await reload()
    } catch (err) {
      console.error('Gagal mencatat aktivitas WA:', err)
    }
  }

  const getDataQualityIssues = (visitor: any) => {
    const issues: string[] = []
    const cleanPhone = (visitor.phone || '').replace(/[^0-9]/g, '')
    if (!cleanPhone || cleanPhone.length < 9) issues.push('WA')
    if (!visitor.pic_id) issues.push('PIC')
    if (!visitor.meeting_id && !visitor.meeting_date) issues.push('Meeting')
    if (!visitor.referred_by_member_name && !visitor.referral_name) issues.push('Diajak oleh')
    if (!visitor.business_field) issues.push('Bidang')
    return issues
  }

  // A visitor whose meeting hasn't happened yet is simply "New" — flagging
  // missing PIC/etc. is premature, so we show a New badge instead.
  const isUpcomingMeeting = (visitor: any): boolean => {
    const raw = visitor.meeting_date || visitor.meeting?.meeting_date
    if (!raw) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const meetingDay = new Date(`${String(raw).slice(0, 10)}T00:00:00`)
    return !Number.isNaN(meetingDay.getTime()) && meetingDay.getTime() >= today.getTime()
  }

  const toggleSelected = (visitorId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(visitorId)) next.delete(visitorId)
      else next.add(visitorId)
      return next
    })
  }

  const togglePageSelected = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) {
        paginatedVisitors.forEach(visitor => next.delete(visitor.id))
      } else {
        paginatedVisitors.forEach(visitor => next.add(visitor.id))
      }
      return next
    })
  }

  const handleQuickStatusChange = async (visitor: any, status: string) => {
    try {
      const res = await fetch(`/api/visitor-frequency?phone=${encodeURIComponent(visitor.phone)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.exceeded) {
          setFreqWarning({ visitor, pendingStatus: status, ...data })
          return
        }
      }
    } catch {}

    await updateVisitor(visitor.id, {
      status: status as any,
      updated_at: new Date().toISOString(),
    })
    await reload()
  }

  const handleQuickPicChange = async (visitorId: string, picId: string) => {
    const updates: any = {
      pic_id: picId || null,
      updated_at: new Date().toISOString(),
    }

    await updateVisitor(visitorId, updates)
    await reload()
  }

  const handleBulkApply = async () => {
    if (selectedVisitors.length === 0 || (!bulkStatus && !bulkPicId)) return

    setBulkSaving(true)
    try {
      for (const visitor of selectedVisitors) {
        await updateVisitor(visitor.id, {
          ...(bulkStatus ? { status: bulkStatus as any } : {}),
          ...(bulkPicId ? { pic_id: bulkPicId } : {}),
          updated_at: new Date().toISOString(),
        })
      }
      setBulkStatus('')
      setBulkPicId('')
      setSelectedIds(new Set())
      await reload()
    } finally {
      setBulkSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 fade-in-up">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded-xl bg-gray-200/80 animate-pulse" />
          <div className="h-8 w-28 rounded-xl bg-gray-200/80 animate-pulse" />
        </div>
        <TableSkeleton rows={7} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="visitor-toolbar">
        <div className="visitor-toolbar-grid">
          <div className="visitor-filter-group">
            {/* Search */}
            <div className="visitor-search relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama, WA, email, bidang usaha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 text-sm text-gray-900 font-medium placeholder-gray-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="visitor-select text-sm text-gray-900 font-medium"
            >
              <option value="">Semua Status</option>
              {Object.entries(STATUSES).map(([key, value]) => (
                <option key={key} value={key} style={getStatusOptionStyle(key)}>{value.label}</option>
              ))}
            </select>

            {/* Meeting Filter */}
            <select
              value={meetingFilter}
              onChange={(e) => setMeetingFilter(e.target.value)}
              className="visitor-select visitor-select-wide text-sm text-gray-900 font-medium"
            >
              <option value="">Semua Meeting</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title.length > 38 ? m.title.slice(0, 38) + '…' : m.title}
                </option>
              ))}
            </select>

            {/* PIC Filter */}
            <select
              value={picFilter}
              onChange={(e) => setPicFilter(e.target.value)}
              className="visitor-select text-sm text-gray-900 font-medium"
            >
              <option value="">Semua PIC</option>
              {pics.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="visitor-action-group">
            <button
              onClick={handleExportCSV}
              className="visitor-export-button"
              title="Export to CSV"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="visitor-count">
          Menampilkan {filteredVisitors.length} dari {visitors.length} visitor{meetingFilter ? ` (Filtered by Meeting)` : ''}
        </div>
      </div>

      {selectedVisitors.length > 0 && (
        <div className="glass-panel-strong flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm font-semibold text-gray-800">
            {selectedVisitors.length} visitor dipilih
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800"
            >
              <option value="">Ubah status...</option>
              {Object.entries(STATUSES).map(([key, value]) => (
                <option key={key} value={key} style={getStatusOptionStyle(key)}>{value.label}</option>
              ))}
            </select>
            <select
              value={bulkPicId}
              onChange={(e) => setBulkPicId(e.target.value)}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800"
            >
              <option value="">Assign PIC...</option>
              {pics.map(pic => (
                <option key={pic.id} value={pic.id}>{pic.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkApply}
              disabled={bulkSaving || (!bulkStatus && !bulkPicId)}
              className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {bulkSaving ? 'Menyimpan...' : 'Apply'}
            </button>
            <button
              onClick={() => exportVisitorsCSV(selectedVisitors, 'Selected')}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Export Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-10 rounded-xl px-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-white/70"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">

        {/* Mobile: card view */}
        <div className="sm:hidden divide-y divide-gray-100">
          {paginatedVisitors.length === 0 ? (
            <EmptyState
              icon={search || statusFilter || meetingFilter || picFilter ? <SearchEmptyIcon /> : <VisitorEmptyIcon />}
              title={search || statusFilter || meetingFilter || picFilter ? 'Tidak ada hasil' : 'Belum ada visitor'}
              description={search || statusFilter || meetingFilter || picFilter ? 'Coba ubah filter atau kata kunci pencarian.' : 'Mulai tambah visitor pertama untuk chapter ini.'}
              action={!search && !statusFilter && !meetingFilter && !picFilter ? { label: '+ Tambah Visitor', onClick: handleOpenAdd } : undefined}
            />
          ) : paginatedVisitors.map((visitor, index) => {
            const qualityIssues = getDataQualityIssues(visitor)
            return (
              <div key={visitor.id} className={`p-4 ${selectedIds.has(visitor.id) ? 'bg-red-50/40' : ''}`}>
                {/* Row 1: checkbox + nama + status */}
                <div className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(visitor.id)}
                    onChange={() => toggleSelected(visitor.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-sm truncate">{visitor.name}</span>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(visitor.status)}`}>
                        {getStatusLabel(visitor.status, (visitor as any).attended_choice_number)}
                      </span>
                    </div>
                    {(visitor.business_field || visitor.company) && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {visitor.business_field}{visitor.company ? ` • ${visitor.company}` : ''}
                      </p>
                    )}
                    {isUpcomingMeeting(visitor) ? (
                      <div className="mt-1">
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">New</span>
                      </div>
                    ) : qualityIssues.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {qualityIssues.slice(0, 2).map(issue => (
                          <span key={issue} className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{issue}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: phone + gender */}
                <div className="flex items-center justify-between mb-2 pl-7">
                  <span className="text-sm text-gray-700 font-medium">{visitor.phone || '-'}</span>
                  <div className="flex items-center gap-1.5">
                    {visitor.gender && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${visitor.gender === 'Bapak' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                        {visitor.gender}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">#{startIndex + index + 1}</span>
                  </div>
                </div>

                {/* Row 3: PIC + Status dropdown */}
                <div className="flex gap-2 pl-7 mb-3">
                  <select
                    value={visitor.pic_id || ''}
                    onChange={(e) => handleQuickPicChange(visitor.id, e.target.value)}
                    className="flex-1 h-9 rounded-xl border border-purple-100 bg-purple-50 px-2 text-xs font-semibold text-purple-800 min-w-0"
                  >
                    <option value="">Belum ada PIC</option>
                    {pics.map(pic => <option key={pic.id} value={pic.id}>{pic.name}</option>)}
                  </select>
                  <select
                    value={visitor.status}
                    onChange={(e) => handleQuickStatusChange(visitor, e.target.value)}
                    className={`flex-1 h-9 rounded-xl border-0 px-2 text-xs font-semibold min-w-0 ${getStatusBadgeClass(visitor.status)}`}
                  >
                    {Object.entries(STATUSES).map(([key, value]) => (
                      <option key={key} value={key} style={getStatusOptionStyle(key)}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row 4: action buttons */}
                <div className="flex gap-2 pl-7">
                  <a
                    href={buildWaLink(visitor)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackWaActivity(visitor)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-xs font-semibold text-green-700"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                    </svg>
                    WA
                  </a>
                  <button
                    onClick={() => handleOpenDetail(visitor)}
                    className="flex-1 flex items-center justify-center rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700"
                  >Detail</button>
                  <button
                    onClick={() => handleOpenEdit(visitor)}
                    className="flex-1 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"
                  >Edit</button>
                  <button
                    onClick={() => handleDelete(visitor.id)}
                    className="flex items-center justify-center rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-red-600 to-red-700">
              <tr className="text-xs text-white font-bold uppercase tracking-wide">
                <th className="text-left font-medium px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePageSelected}
                    className="h-4 w-4 rounded border-white/70"
                    aria-label="Pilih semua visitor halaman ini"
                  />
                </th>
                <th className="text-left font-medium px-4 py-3">No</th>
                <th className="text-left font-medium px-4 py-3">Nama</th>
                <th className="text-left font-medium px-4 py-3">Gender</th>
                <th className="text-left font-medium px-4 py-3">Bidang Usaha</th>
                <th className="text-left font-medium px-4 py-3">Perusahaan</th>
                <th className="text-left font-medium px-4 py-3">No WA</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Diajak Oleh</th>
                <th className="text-left font-medium px-4 py-3 min-w-[120px]">PIC</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisitors.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState
                      icon={search || statusFilter || meetingFilter || picFilter ? <SearchEmptyIcon /> : <VisitorEmptyIcon />}
                      title={search || statusFilter || meetingFilter || picFilter ? 'Tidak ada hasil' : 'Belum ada visitor'}
                      description={search || statusFilter || meetingFilter || picFilter ? 'Coba ubah filter atau kata kunci pencarian.' : 'Mulai tambah visitor pertama untuk chapter ini.'}
                      action={!search && !statusFilter && !meetingFilter && !picFilter ? { label: '+ Tambah Visitor', onClick: handleOpenAdd } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedVisitors.map((visitor, index) => {
                  const qualityIssues = getDataQualityIssues(visitor)

                  return (
                  <tr key={visitor.id} className={`border-t border-gray-100 hover:bg-gray-50 ${selectedIds.has(visitor.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(visitor.id)}
                        onChange={() => toggleSelected(visitor.id)}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label={`Pilih ${visitor.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600 font-medium">{startIndex + index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-[13px]">{visitor.name}</div>
                      <div className="text-xs text-gray-500 md:hidden">{visitor.phone}</div>
                      {isUpcomingMeeting(visitor) ? (
                        <div className="mt-1">
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">New</span>
                        </div>
                      ) : qualityIssues.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {qualityIssues.slice(0, 2).map(issue => (
                            <span key={issue} className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              {issue}
                            </span>
                          ))}
                          {qualityIssues.length > 2 && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              +{qualityIssues.length - 2}
                            </span>
                          )}
                        </div>
                      )}
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
                      {visitor.company || '-'}
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
                    <td className="px-4 py-3 text-[13px] min-w-[120px]">
                      <select
                        value={visitor.pic_id || ''}
                        onChange={(e) => handleQuickPicChange(visitor.id, e.target.value)}
                        className="h-9 w-[140px] rounded-xl border border-purple-100 bg-purple-50 px-2 text-xs font-semibold text-purple-800"
                      >
                        <option value="">Belum ada PIC</option>
                        {pics.map(pic => (
                          <option key={pic.id} value={pic.id}>{pic.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={visitor.status}
                        onChange={(e) => handleQuickStatusChange(visitor, e.target.value)}
                        className={`h-9 w-[150px] rounded-xl border-0 px-2 text-xs font-semibold ${getStatusBadgeClass(visitor.status)}`}
                        title={getStatusLabel(visitor.status, (visitor as any).attended_choice_number)}
                      >
                        {Object.entries(STATUSES).map(([key, value]) => (
                          <option key={key} value={key} style={getStatusOptionStyle(key)}>{value.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={buildWaLink(visitor)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackWaActivity(visitor)}
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Kirim WhatsApp"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                          </svg>
                        </a>
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
                  )
                })
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
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-spring-enter bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    Chapter {chapterBranding.shortName}
                  </label>
                  <input
                    type="text"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    placeholder={`Misal: ${chapterBranding.displayName}`}
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

                {/* Airtime result - only show when status is attended. */}
                {formData.status === 'attended' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      Hasil Airtime *
                    </label>
                    <select
                      value={formData.attended_choice_number || ''}
                      onChange={(e) => {
                        const num = parseInt(e.target.value)
                        let note = ''
                        
                        // Map number to description
                        switch(num) {
                          case 1:
                            note = 'Bersedia Bergabung'
                            break
                          case 2:
                            note = 'Pikir-pikir Dulu'
                            break
                          case 3:
                            note = 'Tidak Tertarik'
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
                      <option value="1">1 - Bersedia Bergabung</option>
                      <option value="2">2 - Pikir-pikir Dulu</option>
                      <option value="3">3 - Tidak Tertarik</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Diisi setelah visitor benar-benar hadir dan mengikuti sesi Airtime.</p>
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
          onSaved={async (savedVisitor) => {
            setSelectedVisitor(savedVisitor)
            await reload()
          }}
          onEdit={(v) => {
            handleCloseDetail()
            handleOpenEdit(v)
          }}
        />
      )}

      {/* Modal: Visitor Frequency Warning */}
      {freqWarning && (
        <div className="app-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="modal-spring-enter bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Batas Kunjungan Tercapai</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {freqWarning.visitor.name} sudah hadir{' '}
                  <strong className="text-amber-700">{freqWarning.count}×</strong> dalam{' '}
                  {freqWarning.periodMonths} bulan terakhir (batas: {freqWarning.limit}×)
                </p>
              </div>
            </div>

            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Riwayat Kehadiran</p>
              <div className="space-y-2 mb-5">
                {freqWarning.visits.map((v: any, i: number) => {
                  const meeting = Array.isArray(v.meeting) ? v.meeting[0] : v.meeting
                  const dateStr = meeting?.meeting_date
                    ? new Date(meeting.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-'
                  return (
                    <div key={v.id || i} className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-sm">
                      <span className="font-semibold text-amber-900">{v.chapter || '-'}</span>
                      <span className="text-amber-700">{dateStr}</span>
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        {STATUSES[v.status as keyof typeof STATUSES]?.label || v.status}
                      </span>
                    </div>
                  )
                })}
              </div>

              <p className="text-sm text-gray-600 mb-5">
                Kebijakan nasional membatasi maksimum <strong>{freqWarning.limit} kali</strong> kunjungan dalam{' '}
                <strong>{freqWarning.periodMonths} bulan</strong>. Apakah Anda tetap ingin mengubah status?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setFreqWarning(null)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    const { visitor, pendingStatus } = freqWarning
                    setFreqWarning(null)
                    await updateVisitor(visitor.id, {
                      status: pendingStatus as any,
                      updated_at: new Date().toISOString(),
                    })
                    await reload()
                  }}
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
                >
                  Tetap Ubah Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
