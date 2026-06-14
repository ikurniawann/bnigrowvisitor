'use client'

import { useEffect, useMemo, useState } from 'react'
import { useData } from '@/hooks/useData'
import { getWaTemplateSettings, renderWaTemplate } from '@/lib/waTemplate'
import { getChapterBranding } from '@/lib/chapterBranding'
import { User } from '@/lib/supabase'

interface SentMap {
  [visitorId: string]: boolean
}

function buildWaLink(visitor: any, meetingDateText: string, chapterDisplayName: string): string {
  const clean = (visitor.phone || '').replace(/[^0-9]/g, '')
  const waNumber = clean.startsWith('0')
    ? `62${clean.slice(1)}`
    : clean.startsWith('62')
      ? clean
      : `62${clean}`
  const settings = getWaTemplateSettings()
  const template = settings.templates[settings.activeMode]
  const sapaan = visitor.gender === 'Ibu' ? 'Ibu' : 'Bapak'
  const confirmLink = `${window.location.origin}/wm/${visitor.id}`
  const message = renderWaTemplate(template, {
    sapaan,
    nama: visitor.name,
    pic_nama: visitor.pic_name || '[PIC]',
    pic_bisnis: visitor.pic_business_classification || '[Bisnis PIC]',
    diajak_oleh: visitor.referred_by_member_name || visitor.referral_name || '[Diajak Oleh]',
    tanggal_meeting: meetingDateText,
    jam_meeting: '07.30 - 10.15',
    chapter: visitor.chapter || chapterDisplayName,
    bidang_usaha: visitor.business_field || '',
    perusahaan: visitor.company || '',
    link_hadir: confirmLink,
  })
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
}

const SENT_KEY = 'bni-wa-blast-sent'

function loadSentMap(): SentMap {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveSentMap(map: SentMap) {
  localStorage.setItem(SENT_KEY, JSON.stringify(map))
}

export default function WaBlast() {
  const { visitors, meetings, pics } = useData()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [selectedPicId, setSelectedPicId] = useState('')
  const [sentMap, setSentMap] = useState<SentMap>({})
  const [chapterDisplayName, setChapterDisplayName] = useState('BNI')

  useEffect(() => {
    setChapterDisplayName(getChapterBranding().displayName)
    setSentMap(loadSentMap())
    const stored = localStorage.getItem('user')
    if (stored) setCurrentUser(JSON.parse(stored))
  }, [])

  const isPic = currentUser?.role === 'pic'

  // For PIC role: auto-filter to their own visitors
  const effectivePicId = isPic ? (currentUser?.id || '') : selectedPicId

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)),
    [meetings]
  )

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) ?? null

  const meetingDateText = selectedMeeting
    ? new Date(selectedMeeting.meeting_date).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  // Filter visitors for the selected meeting
  const meetingVisitors = useMemo(() => {
    if (!selectedMeetingId) return []
    return visitors.filter(v => v.meeting_id === selectedMeetingId && v.phone)
  }, [visitors, selectedMeetingId])

  // Group by pic_id (or 'none')
  const groups = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const v of meetingVisitors) {
      if (effectivePicId && v.pic_id !== effectivePicId) continue
      const key = v.pic_id || 'none'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    }
    // Sort: assigned PICs first (by name), then 'none'
    const entries = [...map.entries()].sort(([a], [b]) => {
      if (a === 'none') return 1
      if (b === 'none') return -1
      const picA = pics.find(p => p.id === a)?.name || ''
      const picB = pics.find(p => p.id === b)?.name || ''
      return picA.localeCompare(picB)
    })
    return entries
  }, [meetingVisitors, effectivePicId, pics])

  const totalVisitors = meetingVisitors.filter(v =>
    !effectivePicId || v.pic_id === effectivePicId
  ).length
  const totalSent = Object.values(sentMap).filter(Boolean).length

  function markSent(id: string) {
    const next = { ...sentMap, [id]: true }
    setSentMap(next)
    saveSentMap(next)
  }

  function markUnsent(id: string) {
    const next = { ...sentMap, [id]: false }
    setSentMap(next)
    saveSentMap(next)
  }

  function resetSent() {
    setSentMap({})
    saveSentMap({})
  }

  function openWa(visitor: any) {
    const url = buildWaLink(visitor, meetingDateText, chapterDisplayName)
    window.open(url, '_blank', 'noopener')
    markSent(visitor.id)
  }

  function openAllInGroup(groupVisitors: any[]) {
    const pending = groupVisitors.filter(v => !sentMap[v.id])
    pending.forEach((v, i) => {
      setTimeout(() => {
        window.open(buildWaLink(v, meetingDateText, chapterDisplayName), '_blank', 'noopener')
        markSent(v.id)
      }, i * 400)
    })
  }

  const sentInMeeting = meetingVisitors.filter(v =>
    (!effectivePicId || v.pic_id === effectivePicId) && sentMap[v.id]
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">WA Blast Kit</h1>
        <p className="text-sm text-gray-500 mt-1">Kirim undangan WhatsApp ke visitor per weekly meeting</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Meeting selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Weekly Meeting</label>
            <select
              value={selectedMeetingId}
              onChange={e => setSelectedMeetingId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
            >
              <option value="">— Pilih weekly meeting —</option>
              {sortedMeetings.map(m => (
                <option key={m.id} value={m.id}>
                  {new Date(m.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} — {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* PIC filter (chapter admin only) */}
          {!isPic && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Filter PIC</label>
              <select
                value={selectedPicId}
                onChange={e => setSelectedPicId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800"
              >
                <option value="">Semua PIC</option>
                {pics.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Progress summary */}
        {selectedMeetingId && totalVisitors > 0 && (
          <div className="flex items-center gap-4 pt-1">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-[width]"
                style={{ width: `${Math.round((sentInMeeting / totalVisitors) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600 flex-shrink-0">
              {sentInMeeting} / {totalVisitors} terkirim
            </span>
            {sentInMeeting > 0 && (
              <button onClick={resetSent} className="text-xs text-red-500 hover:text-red-700 font-medium">Reset</button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selectedMeetingId && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-sm text-gray-400">
          Pilih weekly meeting untuk memulai blast
        </div>
      )}

      {selectedMeetingId && totalVisitors === 0 && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-sm text-gray-400">
          Tidak ada visitor dengan nomor WA untuk meeting ini
        </div>
      )}

      {/* Visitor groups */}
      {groups.map(([picId, groupVisitors]) => {
        const pic = pics.find(p => p.id === picId)
        const picName = pic?.name || groupVisitors[0]?.pic_name || (picId === 'none' ? 'Belum Ada PIC' : 'PIC Tidak Dikenal')
        const sentCount = groupVisitors.filter(v => sentMap[v.id]).length
        const pendingCount = groupVisitors.length - sentCount

        return (
          <div key={picId} className="bg-white rounded-xl shadow overflow-hidden">
            {/* PIC header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${picId === 'none' ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                  {picId === 'none' ? '?' : picName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{picName}</p>
                  <p className="text-xs text-gray-500">
                    {sentCount > 0 ? `${sentCount} terkirim · ` : ''}{pendingCount} belum dikirim
                  </p>
                </div>
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={() => openAllInGroup(groupVisitors)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.72 16z"/>
                  </svg>
                  Buka Semua ({pendingCount})
                </button>
              )}
            </div>

            {/* Visitor rows */}
            <div className="divide-y divide-gray-50">
              {groupVisitors.map(v => {
                const isSent = !!sentMap[v.id]
                return (
                  <div key={v.id} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isSent ? 'bg-emerald-50/40' : 'hover:bg-gray-50/60'}`}>
                    {/* Sent toggle */}
                    <button
                      onClick={() => isSent ? markUnsent(v.id) : markSent(v.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSent ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-emerald-400'}`}
                    >
                      {isSent && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>

                    {/* Visitor info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSent ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {v.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{v.phone} {v.company ? `· ${v.company}` : ''}</p>
                    </div>

                    {/* WA button */}
                    <button
                      onClick={() => openWa(v)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isSent ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.553 4.112 1.52 5.845L0 24l6.292-1.493A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.846 0-3.575-.492-5.067-1.348l-.363-.215-3.734.886.926-3.62-.236-.373A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      {isSent ? 'Kirim Lagi' : 'Kirim WA'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
