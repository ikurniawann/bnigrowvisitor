'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/hooks/useData'
import VisitorDetail from './VisitorDetail'

const KANBAN_COLS = [
  { id: 'new', label: 'Baru Daftar', color: 'bg-blue-500', light: 'bg-blue-50', dark: 'text-blue-800' },
  { id: 'followup', label: 'Follow Up', color: 'bg-yellow-500', light: 'bg-yellow-50', dark: 'text-yellow-800' },
  { id: 'confirmed', label: 'Konfirmasi Hadir', color: 'bg-green-500', light: 'bg-green-50', dark: 'text-green-800' },
  { id: 'attended', label: 'Hadir', color: 'bg-emerald-500', light: 'bg-emerald-50', dark: 'text-emerald-800' },
  { id: 'interview', label: 'Interview', color: 'bg-purple-500', light: 'bg-purple-50', dark: 'text-purple-800' },
  { id: 'member', label: 'Jadi Member', color: 'bg-cyan-500', light: 'bg-cyan-50', dark: 'text-cyan-800' },
]

export default function Kanban() {
  const router = useRouter()
  const { visitors, pics, loading, reload, updateVisitor } = useData()
  
  // Filters
  const [meetingFilter, setMeetingFilter] = useState('')
  const [picFilter, setPicFilter] = useState('')
  const [search, setSearch] = useState('')
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  
  // Detail modal
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // Filter visitors
  const filteredVisitors = visitors.filter(v => {
    if (search) {
      const s = search.toLowerCase()
      const match = 
        v.name.toLowerCase().includes(s) ||
        v.phone?.includes(s) ||
        v.business_field?.toLowerCase().includes(s)
      if (!match) return false
    }
    if (meetingFilter && v.meeting_date !== meetingFilter) return false
    if (picFilter && v.pic_id !== picFilter) return false
    return true
  })

  // Group by status
  const visitorsByStatus = KANBAN_COLS.reduce((acc, col) => {
    acc[col.id] = filteredVisitors.filter(v => v.status === col.id)
    return acc
  }, {} as Record<string, typeof visitors>)

  const handleDragStart = (e: React.DragEvent, visitorId: string) => {
    setDraggingId(visitorId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', visitorId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const visitorId = e.dataTransfer.getData('text/plain')
    
    if (visitorId && status) {
      await updateStatus(visitorId, status)
    }
    
    setDraggingId(null)
  }

  const updateStatus = async (visitorId: string, newStatus: string) => {
    // Add to updating set
    setUpdatingIds(prev => new Set(prev).add(visitorId))
    
    try {
      // Optimistic update via hook
      await updateVisitor(visitorId, {
        status: newStatus as any,
        updated_at: new Date().toISOString()
      })
      
      // Don't reload entire page, just update the visitor in local state
      // The useData hook will handle optimistic updates
    } catch (err: any) {
      alert('Gagal update status: ' + err.message)
      // Reload only on error to rollback
      await reload()
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(visitorId)
        return next
      })
    }
  }

  const handleOpenDetail = (visitor: any) => {
    setSelectedVisitor(visitor)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedVisitor(null)
  }

  const getUniqueDates = () => {
    const dates = Array.from(new Set(visitors.map(v => v.meeting_date).filter(Boolean) as string[]))
    return dates.sort().reverse()
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
    <div className="h-full flex flex-col">
      {/* Fullscreen Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Kanban Board</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-add-visitor'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Tambah Visitor
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Cari visitor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 text-gray-900 font-medium placeholder-gray-500"
            />
          </div>

          {/* Meeting Filter */}
          <select
            value={meetingFilter}
            onChange={(e) => setMeetingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
          >
            <option value="">Semua Tanggal</option>
            {getUniqueDates().map(date => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>

          {/* PIC Filter */}
          <select
            value={picFilter}
            onChange={(e) => setPicFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
          >
            <option value="">Semua PIC</option>
            {pics.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        <div className="text-sm text-gray-500">
          Total: {filteredVisitors.length} visitor
        </div>
      </div>

      {/* Kanban Board - Fullscreen */}
      <div className="flex-1 overflow-x-auto bg-gray-50 p-4">
        <div className="flex gap-3 min-w-max pb-4">
          {KANBAN_COLS.map((col) => {
            const colVisitors = visitorsByStatus[col.id] || []
            
            return (
              <div
                key={col.id}
                className="flex-shrink-0 w-72 lg:w-80 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.light} flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.color}`} />
                    <h3 className={`text-sm font-semibold ${col.dark}`}>{col.label}</h3>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.light} ${col.dark}`}>
                    {colVisitors.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className={`bg-gray-100 rounded-b-lg p-2 flex-1 space-y-2 min-h-[200px]`}>
                  {colVisitors.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Kosong
                    </div>
                  ) : (
                    colVisitors.map((visitor) => (
                      <div
                        key={visitor.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, visitor.id)}
                        onClick={() => handleOpenDetail(visitor)}
                        className={`
                          bg-white rounded-lg p-3 shadow-sm border-l-4 
                          cursor-grab active:cursor-grabbing
                          hover:shadow-md transition-shadow
                          ${draggingId === visitor.id ? 'opacity-50 rotate-2' : ''}
                          ${updatingIds.has(visitor.id) ? 'opacity-70' : ''}
                          ${col.id === 'new' ? 'border-blue-500' : ''}
                          ${col.id === 'followup' ? 'border-yellow-500' : ''}
                          ${col.id === 'confirmed' ? 'border-green-500' : ''}
                          ${col.id === 'attended' ? 'border-emerald-500' : ''}
                          ${col.id === 'interview' ? 'border-purple-500' : ''}
                          ${col.id === 'member' ? 'border-cyan-500' : ''}
                        `}
                      >
                        {/* Visitor Name */}
                        <div className="font-semibold text-sm text-gray-900 mb-1 truncate">
                          {visitor.name}
                        </div>

                        {/* Business Field */}
                        {visitor.business_field && (
                          <div className="text-xs text-gray-500 mb-2 truncate">
                            {visitor.business_field}
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span className="truncate max-w-[100px]">{visitor.phone}</span>
                          </div>
                          
                          {/* PIC Avatar */}
                          {visitor.pic_name && (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {visitor.pic_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Quick Status Change Buttons */}
                        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                          {col.id !== 'new' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const prevCol = KANBAN_COLS[KANBAN_COLS.findIndex(c => c.id === col.id) - 1]
                                if (prevCol) updateStatus(visitor.id, prevCol.id)
                              }}
                              disabled={updatingIds.has(visitor.id)}
                              className="flex-1 px-1.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                              title="Move back"
                            >
                              ←
                            </button>
                          )}
                          {col.id !== 'member' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const nextCol = KANBAN_COLS[KANBAN_COLS.findIndex(c => c.id === col.id) + 1]
                                if (nextCol) updateStatus(visitor.id, nextCol.id)
                              }}
                              disabled={updatingIds.has(visitor.id)}
                              className="flex-1 px-1.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors disabled:opacity-50"
                              title="Move forward"
                            >
                              Next →
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
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
    </div>
  )
}
