'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'

interface VisitorDetailProps {
  visitor: any
  onClose: () => void
  onEdit: (visitor: any) => void
}

const STATUSES = {
  new:          { label: 'Baru Daftar',      badge: 'bg-blue-100 text-blue-800', btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  followup:     { label: 'Follow Up',         badge: 'bg-yellow-100 text-yellow-800', btn: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  confirmed:    { label: 'Konfirmasi Hadir',  badge: 'bg-green-100 text-green-800', btn: 'bg-red-600 text-white hover:bg-red-700' },
  attended:     { label: 'Hadir',             badge: 'bg-emerald-100 text-emerald-800', btn: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  no_show:      { label: 'Tidak Hadir',       badge: 'bg-red-100 text-red-800', btn: 'bg-red-100 text-red-700 hover:bg-red-200' },
  // Interview, Member, Not Continue will be managed from "Visitor Hadir" page
}

export default function VisitorDetail({ visitor, onClose, onEdit }: VisitorDetailProps) {
  const { updateVisitor, reload } = useData()
  const [updating, setUpdating] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showAttendedOptions, setShowAttendedOptions] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  const getStatusBadgeClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.badge || 'bg-gray-100 text-gray-800'
  }

  const getStatusBtnClass = (status: string) => {
    return STATUSES[status as keyof typeof STATUSES]?.btn || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  const handleStatusClick = (newStatus: string) => {
    if (newStatus === visitor.status) return
    
    // If changing to 'attended', show options first
    if (newStatus === 'attended') {
      setPendingStatus(newStatus)
      setShowAttendedOptions(true)
      return
    }
    
    // For other statuses, update directly
    handleStatusChange(newStatus)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === visitor.status) return
    
    setUpdating(true)
    try {
      await updateVisitor(visitor.id, { 
        status: newStatus as any,
        updated_at: new Date().toISOString()
      })
      await reload()
      
      // Update local visitor data
      visitor.status = newStatus
    } catch (err: any) {
      alert('Gagal update status: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleAttendedOptionSelect = async (option: string) => {
    if (!pendingStatus) return
    
    setUpdating(true)
    try {
      let note = ''
      
      switch (option) {
        case 'interview':
          note = '[Hadir] Bersedia di-interview'
          break
        case 'thinking':
          note = '[Hadir] Masih pikir-pikir'
          break
        case 'reject':
          note = '[Hadir] Menolak untuk bergabung'
          break
      }
      
      // Update status to attended (jika belum)
      await updateVisitor(visitor.id, {
        status: 'attended',
        updated_at: new Date().toISOString()
      })
      
      // Add note
      if (note) {
        const timestamp = new Date().toLocaleString('id-ID', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        const newNote = `[${timestamp}] ${note}\n`
        const currentNotes = visitor.notes || ''
        
        await updateVisitor(visitor.id, {
          notes: currentNotes + newNote,
          updated_at: new Date().toISOString()
        })
      }
      
      await reload()
      visitor.status = 'attended'
      setShowAttendedOptions(false)
      setPendingStatus(null)
    } catch (err: any) {
      alert('Gagal update: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    
    setUpdating(true)
    try {
      const currentNotes = visitor.notes || ''
      const timestamp = new Date().toLocaleString('id-ID', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      const newNote = `[${timestamp}] ${noteText}\n`
      
      await updateVisitor(visitor.id, {
        notes: currentNotes + newNote,
        updated_at: new Date().toISOString()
      })
      
      await reload()
      visitor.notes = currentNotes + newNote
      setNoteText('')
      setAddingNote(false)
    } catch (err: any) {
      alert('Gagal tambah catatan: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const formatWaLink = (phone: string, visitorName?: string) => {
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
    
    // Add message template if visitor name provided
    if (visitorName) {
      const meetingDate = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const message = `Selamat Siang Pak/Bu ${visitorName},\n\nPerkenalkan saya salah satu Visitor Host BNI Grow Chapter Jakarta.\n\nAnda diundang untuk ikut weekly meeting BNI Grow besok:\n📅 ${meetingDate}\n⏰ Pagi jam 07.30 - 10.15 WIB\n\nMohon konfirmasi, apakah Bapak/Ibu ${visitorName} akan hadir di online meeting besok jam 7.30 pagi?\n\nKonfirmasi kehadiran ini penting untuk menentukan pembagian room/seat saat open networking.\n\nTerima kasih,\nVisitor Host BNI Grow Jakarta`;
      return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    }
    
    return `https://wa.me/${waNumber}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
              {visitor.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-gray-900 truncate">{visitor.name}</h4>
              <p className="text-sm text-gray-600 truncate">
                {visitor.business_field || 'Bidang Usaha'} {visitor.company && `- ${visitor.company}`}
              </p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(visitor.status)}`}>
                {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status}
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak</h5>
            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
              <div className="text-gray-500">WhatsApp</div>
              <a 
                href={formatWaLink(visitor.phone, visitor.name)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:underline font-medium"
              >
                {visitor.phone}
              </a>
              <div className="text-gray-500">Email</div>
              <div className="text-gray-900">{visitor.email || '-'}</div>
            </div>
          </div>

          {/* Visitor Info */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Info Visitor</h5>
            <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
              <div className="text-gray-500">Chapter</div>
              <div className="text-gray-900">{visitor.chapter || '-'}</div>
              <div className="text-gray-500">Diajak oleh</div>
              <div className="text-gray-900">
                {(visitor as any).referred_by_member_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">
                      {(visitor as any).referred_by_member_name.charAt(0).toUpperCase()}
                    </span>
                    {(visitor as any).referred_by_member_name}
                  </span>
                ) : (
                  visitor.referral_name || '-'
                )}
              </div>
              <div className="text-gray-500">Tanggal</div>
              <div className="text-gray-900">{visitor.meeting_date ? new Date(visitor.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
              <div className="text-gray-500">PIC</div>
              <div className="text-gray-900">
                {visitor.pic_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                      {visitor.pic_name.charAt(0).toUpperCase()}
                    </span>
                    {visitor.pic_name}
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
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUSES).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  disabled={updating || key === visitor.status}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    key === visitor.status
                      ? 'ring-2 ring-offset-1 ring-red-500 ' + getStatusBtnClass(key)
                      : getStatusBtnClass(key)
                  }`}
                >
                  {value.label}
                </button>
              ))}
            </div>
            
            {/* Info for final statuses */}
            {['interview', 'member', 'not_continue'].includes(visitor.status) && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  ℹ️ Status {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status} dikelola dari halaman <strong>Visitor Hadir</strong>.
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

          {/* Notes Section */}
          {visitor.notes && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Catatan</h5>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border-l-4 border-red-500 max-h-48 overflow-y-auto">
                <div className="whitespace-pre-wrap">{visitor.notes}</div>
              </div>
            </div>
          )}

          {/* Add Note */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Riwayat</h5>
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
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose()
              onEdit(visitor)
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
