'use client'

import { useEffect, useState } from 'react'
import { useData } from '@/hooks/useData'
import { getWaTemplateSettings, renderWaTemplate } from '@/lib/waTemplate'

interface VisitorDetailProps {
  visitor: any
  onClose: () => void
  onEdit: (visitor: any) => void
  onSaved?: (visitor: any) => void | Promise<void>
}

const STATUSES = {
  new:          { label: 'Baru Daftar',      badge: 'bg-blue-100 text-blue-800', btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  followup:     { label: 'Follow Up',         badge: 'bg-yellow-100 text-yellow-800', btn: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  confirmed:    { label: 'Konfirmasi Hadir',  badge: 'bg-green-100 text-green-800', btn: 'bg-orange-500 text-white hover:bg-orange-600 shadow-[0_10px_22px_rgba(249,115,22,0.24)]' },
  attended:     { label: 'Hadir',             badge: 'bg-emerald-100 text-emerald-800', btn: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  no_show:      { label: 'Tidak Hadir',       badge: 'bg-red-100 text-red-800', btn: 'bg-red-100 text-red-700 hover:bg-red-200' },
  // Interview, Member, Not Continue will be managed from "Visitor Hadir" page
}

const STATUS_FLOW = ['new', 'followup', 'confirmed', 'attended'] as const

export default function VisitorDetail({ visitor, onClose, onSaved }: VisitorDetailProps) {
  const { updateVisitor, reload } = useData()
  const [originalVisitor, setOriginalVisitor] = useState(visitor)
  const [currentVisitor, setCurrentVisitor] = useState(visitor)
  const [updating, setUpdating] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showAttendedOptions, setShowAttendedOptions] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  useEffect(() => {
    setOriginalVisitor(visitor)
    setCurrentVisitor(visitor)
  }, [visitor])

  const getStatusBadgeClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.badge || 'bg-gray-100 text-gray-800'
  }

  const getStatusBtnClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.btn || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  const getActiveStatusRingClass = (status: string) => {
    return status === 'confirmed' ? 'ring-2 ring-offset-1 ring-orange-400' : 'ring-2 ring-offset-1 ring-red-500'
  }

  const getStatusLabel = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.label || status
  }

  const getTimestamp = () => new Date().toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const getTimelineItems = () => {
    const notes = (currentVisitor.notes || '').split('\n').map((line: string) => line.trim()).filter(Boolean)
    return notes.map((line: string, index: number) => {
      const match = line.match(/^\[(.*?)\]\s*(.*)$/)
      return {
        id: `${index}-${line}`,
        time: match?.[1] || 'Tanpa tanggal',
        text: match?.[2] || line,
      }
    }).reverse()
  }

  const isDirty =
    currentVisitor.status !== originalVisitor.status ||
    (currentVisitor.notes || '') !== (originalVisitor.notes || '') ||
    (currentVisitor as any).attended_choice_number !== (originalVisitor as any).attended_choice_number ||
    ((currentVisitor as any).attended_choice_note || '') !== (((originalVisitor as any).attended_choice_note || ''))

  const applyDraftUpdates = (updates: any, feedback: string) => {
    setCurrentVisitor((prev: any) => ({ ...prev, ...updates }))
    setFeedbackMessage(feedback)
    window.setTimeout(() => {
      setFeedbackMessage(prev => prev === feedback ? '' : prev)
    }, 2600)
  }

  const handleStatusClick = (newStatus: string) => {
    if (newStatus === currentVisitor.status) return
    
    // If changing to 'attended', show options first
    if (newStatus === 'attended') {
      setPendingStatus(newStatus)
      setShowAttendedOptions(true)
      return
    }
    
    // For other statuses, update directly
    handleStatusChange(newStatus)
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentVisitor.status) return

    const updates: any = {
      status: newStatus as any,
    }
    
    if (currentVisitor.status === 'attended') {
      updates.attended_choice_number = null
      updates.attended_choice_note = null
    }

    const currentNotes = currentVisitor.notes || ''
    const historyNote = `[${getTimestamp()}] Status: ${getStatusLabel(currentVisitor.status)} -> ${getStatusLabel(newStatus)}\n`
    updates.notes = currentNotes + historyNote

    applyDraftUpdates(updates, `Status diubah ke ${getStatusLabel(newStatus)}. Tekan Save untuk menyimpan.`)
  }

  const handleAttendedOptionSelect = (option: string) => {
    if (!pendingStatus) return

    let note = ''
    let choiceNumber = 0
    let choiceNote = ''
    
    switch (option) {
      case 'interview':
        note = '[Hadir] Bersedia di-interview'
        choiceNumber = 1
        choiceNote = 'Bersedia di-interview'
        break
      case 'thinking':
        note = '[Hadir] Masih pikir-pikir'
        choiceNumber = 2
        choiceNote = 'Masih pikir-pikir'
        break
      case 'reject':
        note = '[Hadir] Menolak untuk bergabung'
        choiceNumber = 3
        choiceNote = 'Menolak untuk bergabung'
        break
    }
    
    const currentNotes = currentVisitor.notes || ''
    const timestamp = getTimestamp()
    const newNote = note ? `[${timestamp}] ${note}\n` : ''

    const updates: any = {
      status: 'attended',
      attended_choice_number: choiceNumber,
      attended_choice_note: choiceNote,
      notes: currentNotes + newNote,
    }

    applyDraftUpdates(updates, 'Status diubah ke Hadir. Tekan Save untuk menyimpan.')
    setShowAttendedOptions(false)
    setPendingStatus(null)
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return

    const currentNotes = currentVisitor.notes || ''
    const timestamp = getTimestamp()
    const newNote = `[${timestamp}] ${noteText}\n`
    const updates = {
      notes: currentNotes + newNote,
    }

    applyDraftUpdates(updates, 'Catatan ditambahkan. Tekan Save untuk menyimpan.')
    setNoteText('')
    setAddingNote(true)
  }

  const handleScheduleFollowUp = () => {
    const currentNotes = currentVisitor.notes || ''
    const newNote = `[${getTimestamp()}] Follow-up dijadwalkan\n`
    const updates: any = {
      status: 'followup',
      notes: currentNotes + newNote,
    }

    applyDraftUpdates(updates, 'Follow-up dijadwalkan. Tekan Save untuk menyimpan.')
  }

  const handleSave = async () => {
    setUpdating(true)
    try {
      const updates: any = {
        status: currentVisitor.status,
        notes: currentVisitor.notes || null,
        attended_choice_number: (currentVisitor as any).attended_choice_number || null,
        attended_choice_note: (currentVisitor as any).attended_choice_note || null,
        updated_at: new Date().toISOString(),
      }

      const savedVisitor = { ...currentVisitor, ...updates }
      await updateVisitor(currentVisitor.id, updates)
      await reload()
      await onSaved?.(savedVisitor)
      onClose()
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const formatMeetingDate = () => {
    const rawDate = currentVisitor.meeting_date || currentVisitor.meeting?.meeting_date
    const date = rawDate ? new Date(rawDate) : new Date()
    if (!rawDate) date.setDate(date.getDate() + 1)

    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatWaLink = (phone: string, visitorName?: string, referredByMemberName?: string, gender?: string) => {
    // Clean phone number and add country code
    const clean = phone.replace(/[^0-9]/g, '')
    let waNumber: string
    if (clean.startsWith('0')) {
      waNumber = `62${clean.slice(1)}`
    } else if (clean.startsWith('62')) {
      waNumber = clean
    } else {
      waNumber = `62${clean}`
    }
    
    if (visitorName) {
      const settings = getWaTemplateSettings()
      const visitorGender = gender === 'Ibu' ? 'Ibu' : 'Bapak'
      const template = settings.templates[settings.activeMode]
      const message = renderWaTemplate(template, {
        sapaan: visitorGender,
        nama: visitorName,
        pic: currentVisitor.pic_name || '[PIC]',
        pic_nama: currentVisitor.pic_name || '[PIC]',
        pic_bisnis: currentVisitor.pic_business_classification || '[Bisnis PIC]',
        diajak_oleh: referredByMemberName || '[Diajak Oleh]',
        tanggal_meeting: formatMeetingDate(),
        jam_meeting: '07.30 - 10.15',
        chapter: currentVisitor.chapter || 'Grow',
        bidang_usaha: currentVisitor.business_field || '',
        perusahaan: currentVisitor.company || '',
      })

      return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
    }
    
    return `https://wa.me/${waNumber}`
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Detail Visitor</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Profile Section */}
          <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
              {currentVisitor.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 truncate">{currentVisitor.name}</h4>
              <p className="text-sm text-gray-600 truncate">
                {currentVisitor.business_field || 'Bidang Usaha'} {currentVisitor.company && `- ${currentVisitor.company}`}
              </p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(currentVisitor.status)}`}>
                {(() => {
                  const baseLabel = STATUSES[currentVisitor.status as keyof typeof STATUSES]?.label || currentVisitor.status
                  // If status is 'attended' and has attended_choice_number, append it
                  if (currentVisitor.status === 'attended' && (currentVisitor as any).attended_choice_number) {
                    return `${baseLabel} - ${(currentVisitor as any).attended_choice_number}`
                  }
                  return baseLabel
                })()}
              </span>
              
              {/* Show attended choice note if available */}
              {currentVisitor.status === 'attended' && (currentVisitor as any).attended_choice_note && (
                <p className="text-xs text-gray-600 mt-1">
                  {(currentVisitor as any).attended_choice_note}
                </p>
              )}
            </div>
          </div>

          {feedbackMessage && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {feedbackMessage}
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak</h5>
            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
              <div className="text-gray-500">WhatsApp</div>
              <a 
                href={formatWaLink(currentVisitor.phone, currentVisitor.name, (currentVisitor as any).referred_by_member_name, currentVisitor.gender)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:underline font-medium"
              >
                {currentVisitor.phone}
              </a>
              <div className="text-gray-500">Email</div>
              <div className="text-gray-900">{currentVisitor.email || '-'}</div>
            </div>
          </div>

          {/* Next Action */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Action</h5>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <a
                href={formatWaLink(currentVisitor.phone, currentVisitor.name, (currentVisitor as any).referred_by_member_name, currentVisitor.gender)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                Kirim WA
              </a>
              <button
                onClick={() => setAddingNote(true)}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Tambah Catatan
              </button>
              <button
                onClick={handleScheduleFollowUp}
                disabled={updating}
                className="inline-flex items-center justify-center rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-800 transition-colors hover:bg-yellow-100 disabled:opacity-50"
              >
                Jadwalkan Follow Up
              </button>
            </div>
          </div>

          {/* Visitor Info */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Info Visitor</h5>
            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
              <div className="text-gray-500">Chapter</div>
              <div className="text-gray-900">{currentVisitor.chapter || '-'}</div>
              <div className="text-gray-500">Diajak oleh</div>
              <div className="text-gray-900">
                {(currentVisitor as any).referred_by_member_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">
                      {(currentVisitor as any).referred_by_member_name.charAt(0).toUpperCase()}
                    </span>
                    {(currentVisitor as any).referred_by_member_name}
                  </span>
                ) : (
                  currentVisitor.referral_name || '-'
                )}
              </div>
              <div className="text-gray-500">Tanggal</div>
              <div className="text-gray-900">{currentVisitor.meeting_date ? new Date(currentVisitor.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
              <div className="text-gray-500">PIC</div>
              <div className="text-gray-900">
                {currentVisitor.pic_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                      {currentVisitor.pic_name.charAt(0).toUpperCase()}
                    </span>
                    {currentVisitor.pic_name}
                  </span>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>

          {/* Quick Status Change */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ubah Status</h5>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {STATUS_FLOW.map((key, index) => {
                const value = STATUSES[key]
                const isActive = key === currentVisitor.status

                return (
                <button
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  disabled={updating || isActive}
                  className={`relative rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                    isActive
                      ? `${getActiveStatusRingClass(key)} ${getStatusBtnClass(key)}`
                      : `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50`
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wide opacity-60">Step {index + 1}</span>
                  <span>{value.label}</span>
                </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => handleStatusClick('no_show')}
                disabled={updating || currentVisitor.status === 'no_show'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentVisitor.status === 'no_show'
                    ? `${getActiveStatusRingClass('no_show')} ${getStatusBtnClass('no_show')}`
                    : getStatusBtnClass('no_show')
                }`}
              >
                Tidak Hadir
              </button>
            </div>
            
            {/* Info for final statuses */}
            {['interview', 'member', 'not_continue'].includes(currentVisitor.status) && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  ℹ️ Status {STATUSES[currentVisitor.status as keyof typeof STATUSES]?.label || currentVisitor.status} dikelola dari halaman <strong>Visitor Hadir</strong>.
                </p>
              </div>
            )}
            
            {/* Attended Options Popup */}
            {showAttendedOptions && (
              <div className="mt-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-semibold text-emerald-900 mb-3">
                  👋 Visitor hadir. Apa tindak lanjutnya?
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleAttendedOptionSelect('interview')}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</span>
                    <span>Bersedia di-Interview</span>
                  </button>
                  <button
                    onClick={() => handleAttendedOptionSelect('thinking')}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</span>
                    <span>Masih Pikir-pikir</span>
                  </button>
                  <button
                    onClick={() => handleAttendedOptionSelect('reject')}
                    disabled={updating}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">3</span>
                    <span>Menolak</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttendedOptions(false)
                      setPendingStatus(null)
                    }}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Follow-up Timeline */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Riwayat</h5>
            {getTimelineItems().length > 0 ? (
              <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                {getTimelineItems().map((item: { id: string; time: string; text: string }) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500 ring-4 ring-red-100" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{item.time}</div>
                      <div className="mt-0.5 text-sm text-gray-700">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3 text-sm text-gray-500">
                Belum ada riwayat follow-up.
              </div>
            )}

            {!addingNote ? (
              <button
                onClick={() => setAddingNote(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                + Tambah catatan...
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Tulis catatan..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                <button
                  onClick={handleAddNote}
                  disabled={updating || !noteText.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {updating ? '...' : '+ Tambah'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3 sticky bottom-0 bg-white">
          <div className="text-xs font-medium text-amber-600">
            {isDirty ? 'Perubahan belum disimpan' : ''}
          </div>
          <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updating}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {updating ? 'Saving...' : 'Save'}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
