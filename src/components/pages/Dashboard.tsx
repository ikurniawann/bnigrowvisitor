'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData, VisitorWithRelations } from '@/hooks/useData'
import { supabase, User } from '@/lib/supabase'
import { isNationalAdmin } from '@/lib/permissions'
import { getChapterRoute } from '@/lib/chapterRoute'
import VisitorDetail from './VisitorDetail'

const STATUSES = {
  new:          { label: 'Baru Daftar',      color: '#dbeafe' },
  followup:     { label: 'Follow Up',         color: '#fef3c7' },
  confirmed:    { label: 'Konfirmasi Hadir',  color: '#dcfce7' },
  attended:     { label: 'Hadir',             color: '#d1fae5' },
  no_show:      { label: 'Tidak Hadir',       color: '#fee2e2' },
  interview:    { label: 'Interview',         color: '#ede9fe' },
  member:       { label: 'Jadi Member',       color: '#ccfbf1' },
  not_continue: { label: 'Tidak Lanjut',      color: '#f3f4f6' },
}

type DashboardListModal = {
  title: string
  subtitle: string
  visitors: VisitorWithRelations[]
  accent: string
  empty: string
  meta?: (visitor: VisitorWithRelations) => string
}

type ChapterMeta = {
  id: string
  name: string
  display_name: string
  area_id: string
  area_name: string
  city_id: string
  city_name: string
}

type DashboardMode = 'auto' | 'national' | 'chapter'

export default function Dashboard({ mode = 'auto' }: { mode?: DashboardMode }) {
  const router = useRouter()
  const { visitors, meetings, reload } = useData()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userLoaded, setUserLoaded] = useState(false)
  const [tenantChapterId, setTenantChapterId] = useState('')
  const [chapterMeta, setChapterMeta] = useState<ChapterMeta[]>([])
  
  // Filter state
  const [meetingFilter, setMeetingFilter] = useState<string>('')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [chapterFilter, setChapterFilter] = useState<string>('')
  const [activeFocus, setActiveFocus] = useState<'followup' | 'unassigned' | 'quality' | 'reminder' | null>(null)
  const [activeInsight, setActiveInsight] = useState<DashboardListModal | null>(null)
  const [hoveredFocus, setHoveredFocus] = useState<'followup' | 'unassigned' | 'quality' | 'reminder' | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithRelations | null>(null)

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      setCurrentUser(storedUser ? JSON.parse(storedUser) : null)
      const storedTenant = localStorage.getItem('tenantContext')
      const tenantContext = storedTenant ? JSON.parse(storedTenant) : null
      const storedSelectedChapter = localStorage.getItem('selectedChapterContext')
      const selectedChapterContext = storedSelectedChapter ? JSON.parse(storedSelectedChapter) : null
      setTenantChapterId(selectedChapterContext?.chapter?.id || tenantContext?.chapter?.id || '')
    } catch {
      setCurrentUser(null)
    } finally {
      setUserLoaded(true)
    }
  }, [])

  useEffect(() => {
    async function loadChapterMeta() {
      // Master tables are RLS-locked for the anon key; go through the
      // session-authenticated API instead.
      let data: any[] = []
      try {
        const response = await fetch('/api/chapters', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result?.error || 'Gagal memuat chapter.')
        data = result.chapters || []
      } catch (error) {
        console.error('Error loading chapter meta:', error)
        return
      }

      setChapterMeta((data || []).map((chapter: any) => ({
        id: chapter.id,
        name: chapter.name,
        display_name: chapter.display_name,
        area_id: chapter.area_id,
        area_name: chapter.area_name || '-',
        city_id: chapter.city_id || '',
        city_name: chapter.city_name || '-',
      })))
    }

    loadChapterMeta()
  }, [])

  const canViewNationalDashboard = isNationalAdmin(currentUser)
  const isNationalDashboard = mode === 'national' || (mode === 'auto' && canViewNationalDashboard)
  const chapterMetaById = useMemo(() => new Map(chapterMeta.map(chapter => [chapter.id, chapter])), [chapterMeta])
  const cityOptions = useMemo(() => {
    const map = new Map<string, string>()
    chapterMeta.forEach(chapter => {
      if (chapter.city_id) map.set(chapter.city_id, chapter.city_name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [chapterMeta])
  const areaOptions = useMemo(() => {
    const map = new Map<string, string>()
    chapterMeta
      .filter(chapter => !cityFilter || chapter.city_id === cityFilter)
      .forEach(chapter => map.set(chapter.area_id, chapter.area_name))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [chapterMeta, cityFilter])
  const chapterOptions = useMemo(() => chapterMeta
    .filter(chapter => !cityFilter || chapter.city_id === cityFilter)
    .filter(chapter => !areaFilter || chapter.area_id === areaFilter)
    .sort((a, b) => a.display_name.localeCompare(b.display_name)), [chapterMeta, cityFilter, areaFilter])
  
  // Filter visitors by meeting if selected
  const filteredVisitors = visitors
    .filter(visitor => !meetingFilter || visitor.meeting_id === meetingFilter)
    .filter(visitor => {
      if (mode === 'chapter' && tenantChapterId && visitor.chapter_id !== tenantChapterId) return false
      if (!isNationalDashboard) return true
      const meta = visitor.chapter_id ? chapterMetaById.get(visitor.chapter_id) : undefined
      if (cityFilter && meta?.city_id !== cityFilter) return false
      if (areaFilter && meta?.area_id !== areaFilter) return false
      if (chapterFilter && visitor.chapter_id !== chapterFilter) return false
      return true
    })
  
  const recentVisitors = filteredVisitors.slice(0, 8)

  const needsFollowUp = filteredVisitors.filter(visitor => ['new', 'followup'].includes(visitor.status))
  const unassignedVisitors = filteredVisitors.filter(visitor => !visitor.pic_id)
  const missingDataVisitors = filteredVisitors.filter(visitor => {
    const cleanPhone = (visitor.phone || '').replace(/[^0-9]/g, '')
    return !cleanPhone || cleanPhone.length < 9 || !visitor.pic_id || (!visitor.meeting_id && !visitor.meeting_date)
  })
  const readyWaVisitors = filteredVisitors.filter(visitor => visitor.status === 'new' && Boolean(visitor.pic_id || visitor.pic_name))

  const focusConfigs: Record<'followup' | 'unassigned' | 'quality' | 'reminder', DashboardListModal> = {
    followup: {
      title: 'Today Focus',
      subtitle: 'Visitor yang perlu segera di-follow-up',
      visitors: needsFollowUp,
      accent: 'text-red-600',
      empty: 'Tidak ada visitor yang perlu follow-up.',
    },
    unassigned: {
      title: 'Belum Assigned',
      subtitle: 'Visitor yang belum punya PIC',
      visitors: unassignedVisitors,
      accent: 'text-purple-600',
      empty: 'Semua visitor sudah punya PIC.',
    },
    quality: {
      title: 'Data Quality',
      subtitle: 'Visitor dengan data yang perlu dilengkapi',
      visitors: missingDataVisitors,
      accent: 'text-amber-600',
      empty: 'Tidak ada isu data quality.',
    },
    reminder: {
      title: 'Siap Kirim WA',
      subtitle: 'Visitor baru yang sudah punya PIC',
      visitors: readyWaVisitors,
      accent: 'text-emerald-600',
      empty: 'Belum ada visitor baru yang siap dikirim WA.',
    },
  }

  const focusModal = activeFocus ? focusConfigs[activeFocus] : null
  const activeListModal = activeInsight || focusModal

  const getQualityIssues = (visitor: VisitorWithRelations) => {
    const cleanPhone = (visitor.phone || '').replace(/[^0-9]/g, '')
    const issues = []
    if (!cleanPhone || cleanPhone.length < 9) issues.push('No WA')
    if (!visitor.pic_id) issues.push('PIC')
    if (!visitor.meeting_id && !visitor.meeting_date) issues.push('Meeting')
    return issues
  }

  const getFocusMeta = (visitor: VisitorWithRelations) => {
    if (activeFocus === 'unassigned') return visitor.business_field || 'Belum ada bidang usaha'
    if (activeFocus === 'quality') return `Kurang: ${getQualityIssues(visitor).join(', ')}`
    if (activeFocus === 'reminder') {
      return visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'PIC sudah dipilih'
    }
    return visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'Belum ada PIC'
  }

  const handleOpenDetail = (visitor: VisitorWithRelations) => {
    setSelectedVisitor(visitor)
  }

  const handleCloseDetail = () => {
    setSelectedVisitor(null)
  }

  const openInsightList = (config: {
    title: string
    subtitle: string
    visitors: VisitorWithRelations[]
    accent?: string
    empty?: string
    meta?: (visitor: VisitorWithRelations) => string
  }) => {
    setActiveFocus(null)
    setActiveInsight({
      title: config.title,
      subtitle: config.subtitle,
      visitors: config.visitors,
      accent: config.accent || 'text-orange-600',
      empty: config.empty || 'Belum ada data visitor untuk filter ini.',
      meta: config.meta,
    })
  }
  
  const filteredIndustryDist = (() => {
    const dist: Record<string, number> = {}
    filteredVisitors.forEach(v => {
      const field = v.business_field || 'Lainnya'
      dist[field] = (dist[field] || 0) + 1
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1]) as [string, number][]
  })()
  const topIndustryDist = filteredIndustryDist.slice(0, 10)

  const filteredReferrerDist = (() => {
    const dist: Record<string, number> = {}
    filteredVisitors.forEach(v => {
      if (v.status === 'no_show') return
      const referrerName = (v as any).referred_by_member_name
      if (referrerName) {
        dist[referrerName] = (dist[referrerName] || 0) + 1
      }
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1]) as [string, number][]
  })()

  const meetingTrendData = (() => {
    const getMeetingMode = (title?: string, location?: string, notes?: string) => {
      const text = `${title || ''} ${location || ''} ${notes || ''}`.toLowerCase()
      if (/(online|zoom|google meet|gmeet|meet|link|virtual)/i.test(text)) return 'Online'
      if (/(offline|onsite|on-site|tatap muka|venue|lokasi|hotel|restaurant|resto|cafe|gedung|hall|ruang)/i.test(text)) return 'Offline'
      return location ? 'Offline' : 'Online'
    }

    const meetingMap = new Map<string, { id: string; title: string; date: string; count: number; mode: string }>()

    meetings.forEach(meeting => {
      meetingMap.set(meeting.id, {
        id: meeting.id,
        title: meeting.title,
        date: meeting.meeting_date,
        count: 0,
        mode: getMeetingMode(meeting.title, meeting.location, meeting.notes),
      })
    })

    filteredVisitors.forEach(visitor => {
      if (visitor.meeting_id && meetingMap.has(visitor.meeting_id)) {
        meetingMap.get(visitor.meeting_id)!.count += 1
        return
      }

      if (visitor.meeting_date) {
        const fallbackId = `date-${visitor.meeting_date}`
        const existing = meetingMap.get(fallbackId)
        if (existing) {
          existing.count += 1
        } else {
          meetingMap.set(fallbackId, {
            id: fallbackId,
            title: 'Weekly Meeting',
            date: visitor.meeting_date,
            count: 1,
            mode: 'Online',
          })
        }
      }
    })

    return Array.from(meetingMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10)
  })()
  const meetingTrendMax = Math.max(...meetingTrendData.map(item => item.count), 1)
  const chartWidth = 560
  const chartHeight = 220
  const chartPadding = { top: 20, right: 26, bottom: 46, left: 36 }
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const meetingTrendPoints = meetingTrendData.map((item, index) => {
    const x = chartPadding.left + (meetingTrendData.length <= 1 ? chartInnerWidth / 2 : (index / (meetingTrendData.length - 1)) * chartInnerWidth)
    const y = chartPadding.top + chartInnerHeight - (item.count / meetingTrendMax) * chartInnerHeight
    return { ...item, x, y }
  })
  const meetingTrendPath = meetingTrendPoints.length > 1
    ? meetingTrendPoints.reduce((path, point, index, points) => {
        if (index === 0) return `M ${point.x} ${point.y}`
        const previous = points[index - 1]
        const controlDistance = (point.x - previous.x) * 0.48
        return `${path} C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`
      }, '')
    : ''
  const meetingTrendAreaPath = meetingTrendPath
    ? `${meetingTrendPath} L ${meetingTrendPoints[meetingTrendPoints.length - 1].x} ${chartPadding.top + chartInnerHeight} L ${meetingTrendPoints[0].x} ${chartPadding.top + chartInnerHeight} Z`
    : ''
  const maxIndustryCount = Math.max(...topIndustryDist.map(([, c]) => c), 1)
  const actualAttendanceVisitors = filteredVisitors.filter(visitor => ['attended', 'interview', 'member', 'not_continue'].includes(visitor.status))
  const airtimeQualifiedVisitors = filteredVisitors.filter(visitor =>
    (visitor.status === 'attended' && Number((visitor as any).attended_choice_number) === 1) ||
    ['interview', 'member'].includes(visitor.status)
  )
  const funnelSteps = [
    { label: 'Visitor', count: filteredVisitors.length, color: 'from-slate-400 to-slate-500' },
    { label: 'Confirmed', count: filteredVisitors.filter(visitor => visitor.status === 'confirmed').length, color: 'from-green-400 to-green-500' },
    { label: 'Hadir', count: actualAttendanceVisitors.length, color: 'from-emerald-400 to-emerald-500' },
    { label: 'Airtime Qualified', count: airtimeQualifiedVisitors.length, color: 'from-orange-400 to-red-500' },
    { label: 'Member', count: filteredVisitors.filter(visitor => visitor.status === 'member').length, color: 'from-cyan-400 to-cyan-500' },
  ]
  const funnelBase = Math.max(funnelSteps[0]?.count || 0, 1)
  const sortedReferrerDist = [...filteredReferrerDist].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const referrerColumnBreak = Math.ceil(sortedReferrerDist.length / 2)
  const referrerColumns = [
    sortedReferrerDist.slice(0, referrerColumnBreak),
    sortedReferrerDist.slice(referrerColumnBreak),
  ]
  const maxReferrerCount = Math.max(...filteredReferrerDist.map(([, c]) => c), 1)

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      followup: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      attended: 'bg-emerald-100 text-emerald-800',
      no_show: 'bg-red-100 text-red-800',
      interview: 'bg-purple-100 text-purple-800',
      member: 'bg-cyan-100 text-cyan-800',
      not_continue: 'bg-gray-100 text-gray-800',
    }
    return classes[status] || 'bg-gray-100 text-gray-800'
  }

  if (mode === 'national' && userLoaded && !canViewNationalDashboard) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-950">Akses National Dashboard Terbatas</h1>
        <p className="mt-2 text-sm text-gray-500">Dashboard nasional hanya untuk National Admin BNI Indonesia.</p>
        <button
          onClick={() => router.push(getChapterRoute('dashboard', currentUser))}
          className="mt-5 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Buka Chapter Dashboard
        </button>
      </div>
    )
  }

  const nationalChapterRows = chapterMeta.map(chapter => {
    const chapterVisitors = filteredVisitors.filter(visitor => visitor.chapter_id === chapter.id)
    const attendedCount = chapterVisitors.filter(visitor => ['attended', 'interview', 'member', 'not_continue'].includes(visitor.status)).length
    const memberCount = chapterVisitors.filter(visitor => visitor.status === 'member').length
    return {
      ...chapter,
      visitors: chapterVisitors,
      total: chapterVisitors.length,
      attended: attendedCount,
      members: memberCount,
      conversion: chapterVisitors.length ? Math.round((memberCount / chapterVisitors.length) * 100) : 0,
    }
  }).filter(chapter => chapter.total > 0 || !chapterFilter)
    .sort((a, b) => b.total - a.total || b.attended - a.attended || a.display_name.localeCompare(b.display_name))

  const nationalCityRows = cityOptions.map(city => {
    const cityChapterIds = new Set(chapterMeta.filter(chapter => chapter.city_id === city.id).map(chapter => chapter.id))
    const cityVisitors = filteredVisitors.filter(visitor => visitor.chapter_id && cityChapterIds.has(visitor.chapter_id))
    return {
      id: city.id,
      name: city.name,
      total: cityVisitors.length,
      chapters: chapterMeta.filter(chapter => chapter.city_id === city.id).length,
    }
  }).filter(city => city.total > 0 || !cityFilter)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  const nationalMaxChapterTotal = Math.max(...nationalChapterRows.map(chapter => chapter.total), 1)
  const nationalMaxCityTotal = Math.max(...nationalCityRows.map(city => city.total), 1)
  const nationalScopeLabel = chapterFilter
    ? chapterMetaById.get(chapterFilter)?.display_name || 'Chapter terpilih'
    : areaFilter
      ? areaOptions.find(area => area.id === areaFilter)?.name || 'Area terpilih'
      : cityFilter
        ? cityOptions.find(city => city.id === cityFilter)?.name || 'Kota terpilih'
        : 'Semua Chapter'

  if (isNationalDashboard) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-red-600 p-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">BNI Indonesia</div>
                <h1 className="mt-2 text-3xl font-black tracking-tight">National Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-white/80">
                  Overview lintas kota, area, dan chapter. Scope aktif: {nationalScopeLabel}.
                </p>
              </div>
              <button
                onClick={() => router.push('/master')}
                className="h-11 rounded-2xl bg-white px-4 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50"
              >
                Kelola Master SaaS
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 lg:grid-cols-4">
            <select
              value={cityFilter}
              onChange={(event) => {
                setCityFilter(event.target.value)
                setAreaFilter('')
                setChapterFilter('')
              }}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
            >
              <option value="">Semua Kota</option>
              {cityOptions.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
            <select
              value={areaFilter}
              onChange={(event) => {
                setAreaFilter(event.target.value)
                setChapterFilter('')
              }}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
            >
              <option value="">Semua Area</option>
              {areaOptions.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
            <select
              value={chapterFilter}
              onChange={(event) => setChapterFilter(event.target.value)}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
            >
              <option value="">Semua Chapter</option>
              {chapterOptions.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.display_name}</option>)}
            </select>
            <select
              value={meetingFilter}
              onChange={(event) => setMeetingFilter(event.target.value)}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-300 focus:ring-4 focus:ring-red-100"
            >
              <option value="">Semua Meeting</option>
              {meetings.map(meeting => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title} - {new Date(meeting.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Total Visitor', value: filteredVisitors.length, hint: `${nationalChapterRows.length} chapter aktif`, accent: 'text-blue-600' },
            { label: 'Chapter', value: chapterMeta.length, hint: 'Terdaftar di platform', accent: 'text-purple-600' },
            { label: 'Konfirmasi', value: filteredVisitors.filter(visitor => visitor.status === 'confirmed').length, hint: 'Janji hadir', accent: 'text-green-600' },
            { label: 'Hadir Aktual', value: actualAttendanceVisitors.length, hint: 'Datang meeting', accent: 'text-emerald-600' },
            { label: 'Jadi Member', value: funnelSteps[4].count, hint: 'Konversi nasional', accent: 'text-orange-600' },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => {
                const visitorsForCard = card.label === 'Konfirmasi'
                  ? filteredVisitors.filter(visitor => visitor.status === 'confirmed')
                  : card.label === 'Hadir Aktual'
                    ? actualAttendanceVisitors
                    : card.label === 'Jadi Member'
                      ? filteredVisitors.filter(visitor => visitor.status === 'member')
                      : filteredVisitors
                openInsightList({
                  title: card.label,
                  subtitle: `${card.hint} - ${nationalScopeLabel}`,
                  visitors: visitorsForCard,
                  accent: card.accent,
                  meta: visitor => {
                    const chapter = visitor.chapter_id ? chapterMetaById.get(visitor.chapter_id) : undefined
                    return chapter ? `${chapter.city_name} / ${chapter.display_name}` : visitor.pic_name || 'Belum ada chapter'
                  },
                })
              }}
              className="rounded-3xl border border-white/70 bg-white/80 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{card.label}</div>
              <div className={`mt-3 text-4xl font-black ${card.accent}`}>{card.value}</div>
              <div className="mt-2 text-sm font-medium text-gray-500">{card.hint}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-950">Chapter Leaderboard</h3>
                <p className="mt-1 text-sm text-gray-500">Ranking berdasarkan jumlah visitor dalam scope aktif.</p>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Top 10</span>
            </div>
            <div className="space-y-3">
              {nationalChapterRows.slice(0, 10).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">Belum ada data chapter.</div>
              ) : nationalChapterRows.slice(0, 10).map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-gray-100 bg-white/80 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-sm font-black text-white">{index + 1}</div>
                  <button
                    className="min-w-0 text-left"
                    onClick={() => openInsightList({
                      title: chapter.display_name,
                      subtitle: `${chapter.city_name} / ${chapter.area_name}`,
                      visitors: chapter.visitors,
                      accent: 'text-orange-600',
                      meta: visitor => visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'Belum ada PIC',
                    })}
                  >
                    <div className="truncate text-sm font-black text-gray-950">{chapter.display_name}</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">{chapter.city_name} / {chapter.area_name}</div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-300 via-orange-400 to-red-400" style={{ width: `${(chapter.total / nationalMaxChapterTotal) * 100}%` }} />
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xl font-black text-gray-950">{chapter.total}</div>
                    <div className="text-xs font-semibold text-gray-500">{chapter.attended} hadir</div>
                    <button
                      onClick={() => {
                        localStorage.setItem('selectedChapterContext', JSON.stringify({
                          chapter: { id: chapter.id, name: chapter.name, display_name: chapter.display_name },
                          area: chapter.area_name ? { id: chapter.area_id, name: chapter.area_name } : null,
                          city: chapter.city_name ? { id: chapter.city_id, name: chapter.city_name } : null,
                        }))
                        router.push(`/chapter/${encodeURIComponent(chapter.id)}/dashboard`)
                      }}
                      className="mt-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Buka →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <h3 className="text-base font-black text-gray-950">Kota Performance</h3>
              <div className="mt-4 space-y-3">
                {nationalCityRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Belum ada data kota.</div>
                ) : nationalCityRows.map(city => (
                  <div key={city.id} className="rounded-2xl bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-gray-900">{city.name}</div>
                        <div className="text-xs text-gray-500">{city.chapters} chapter</div>
                      </div>
                      <div className="text-sm font-black text-orange-600">{city.total}</div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-300 to-red-400" style={{ width: `${(city.total / nationalMaxCityTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <h3 className="text-base font-black text-gray-950">Conversion Funnel Nasional</h3>
              <div className="mt-4 space-y-3">
                {funnelSteps.map(step => {
                  const pct = Math.round((step.count / funnelBase) * 100)
                  return (
                    <button
                      key={step.label}
                      onClick={() => openInsightList({
                        title: step.label,
                        subtitle: `Tahap ${step.label} - ${nationalScopeLabel}`,
                        visitors: step.label === 'Visitor'
                          ? filteredVisitors
                          : step.label === 'Confirmed'
                            ? filteredVisitors.filter(visitor => visitor.status === 'confirmed')
                            : step.label === 'Hadir'
                              ? actualAttendanceVisitors
                              : step.label === 'Airtime Qualified'
                                ? airtimeQualifiedVisitors
                                : filteredVisitors.filter(visitor => visitor.status === 'member'),
                        accent: 'text-orange-600',
                      })}
                      className="w-full rounded-2xl bg-white/80 p-3 text-left transition hover:bg-orange-50"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                        <span>{step.label}</span>
                        <span>{step.count} / {pct}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full bg-gradient-to-r ${step.color}`} style={{ width: `${Math.max(pct, step.count > 0 ? 8 : 0)}%` }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <h3 className="text-base font-black text-gray-950">Top Industri Nasional</h3>
            <div className="mt-4 space-y-3">
              {topIndustryDist.length > 0 ? topIndustryDist.map(([industry, count]) => (
                <button
                  key={industry}
                  onClick={() => openInsightList({
                    title: industry,
                    subtitle: `Visitor dari industri ini - ${nationalScopeLabel}`,
                    visitors: filteredVisitors.filter(visitor => (visitor.business_field || 'Lainnya') === industry),
                    accent: 'text-orange-600',
                  })}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-orange-50"
                >
                  <div className="w-36 truncate text-xs font-semibold text-gray-600">{industry}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-300 to-red-400" style={{ width: `${(count / maxIndustryCount) * 100}%` }} />
                  </div>
                  <div className="w-8 text-right text-xs font-black text-gray-900">{count}</div>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">Belum ada data industri.</div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <h3 className="text-base font-black text-gray-950">Visitor Terbaru Nasional</h3>
            <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
              {recentVisitors.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">Belum ada visitor dalam scope ini.</div>
              ) : recentVisitors.map(visitor => {
                const chapter = visitor.chapter_id ? chapterMetaById.get(visitor.chapter_id) : undefined
                return (
                  <button key={visitor.id} onClick={() => handleOpenDetail(visitor)} className="grid w-full grid-cols-[1fr_auto] gap-3 bg-white/80 p-4 text-left transition hover:bg-orange-50">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-gray-950">{visitor.name}</div>
                      <div className="mt-1 truncate text-xs text-gray-500">{chapter ? `${chapter.city_name} / ${chapter.display_name}` : visitor.business_field || '-'}</div>
                    </div>
                    <span className={`h-fit rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(visitor.status)}`}>
                      {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {activeListModal && (
          <div className="app-modal-backdrop fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">National Insight</div>
                  <h3 className="mt-1 text-xl font-bold text-gray-950">{activeListModal.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{activeListModal.subtitle}</p>
                </div>
                <button onClick={() => setActiveInsight(null)} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" aria-label="Tutup insight">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-[68vh] overflow-y-auto p-5">
                <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="text-sm font-semibold text-gray-700">Data yang ditampilkan</div>
                  <div className={`text-2xl font-black ${activeListModal.accent}`}>{activeListModal.visitors.length}</div>
                </div>

                {activeListModal.visitors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-10 text-center text-sm font-medium text-gray-500">
                    {activeListModal.empty}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
                    {activeListModal.visitors.map(visitor => {
                      const chapter = visitor.chapter_id ? chapterMetaById.get(visitor.chapter_id) : undefined
                      return (
                        <button key={visitor.id} onClick={() => handleOpenDetail(visitor)} className="grid w-full grid-cols-1 gap-3 bg-white px-4 py-4 text-left transition-colors hover:bg-red-50/50 md:grid-cols-[1.2fr_1fr_0.9fr_auto]">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-gray-950">{visitor.name}</div>
                            <div className="mt-1 truncate text-xs text-gray-500">{visitor.company || visitor.business_field || '-'}</div>
                          </div>
                          <div className="min-w-0 text-sm text-gray-600">
                            <div className="truncate">{chapter ? `${chapter.city_name} / ${chapter.display_name}` : visitor.phone || '-'}</div>
                            <div className="mt-1 truncate text-xs text-gray-400">{visitor.email || 'Email belum ada'}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(visitor.status)}`}>
                              {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status}
                            </span>
                            <span className="text-xs font-medium text-gray-500">{activeListModal.meta ? activeListModal.meta(visitor) : visitor.pic_name || 'Belum ada PIC'}</span>
                          </div>
                          <span className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm">Detail</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedVisitor && (
          <VisitorDetail
            visitor={selectedVisitor}
            onClose={handleCloseDetail}
            onSaved={async (savedVisitor) => {
              setSelectedVisitor(savedVisitor)
              await reload()
            }}
            onEdit={() => {
              setSelectedVisitor(null)
              router.push(getChapterRoute('visitors', currentUser))
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Meeting Filter */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Filter Weekly Meeting:</label>
          <select 
            value={meetingFilter} 
            onChange={(e) => setMeetingFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">Semua Meeting</option>
            {meetings.map(meeting => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.title} - {new Date(meeting.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          {meetingFilter && (
            <button
              onClick={() => setMeetingFilter('')}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Today Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveFocus('followup')}
          onMouseEnter={() => setHoveredFocus('followup')}
          onMouseLeave={() => setHoveredFocus(null)}
          className={`dashboard-focus-card rounded-xl border border-transparent bg-white p-4 text-left shadow transition-all hover:-translate-y-0.5 ${hoveredFocus === 'followup' ? 'is-focus-hover' : ''}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Today Focus</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{needsFollowUp.length}</div>
          <div className="mt-1 text-sm text-gray-600">Perlu follow-up</div>
        </button>

        <button
          onClick={() => setActiveFocus('unassigned')}
          onMouseEnter={() => setHoveredFocus('unassigned')}
          onMouseLeave={() => setHoveredFocus(null)}
          className={`dashboard-focus-card rounded-xl border border-transparent bg-white p-4 text-left shadow transition-all hover:-translate-y-0.5 ${hoveredFocus === 'unassigned' ? 'is-focus-hover' : ''}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Belum Assigned</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{unassignedVisitors.length}</div>
          <div className="mt-1 text-sm text-gray-600">Belum ada PIC</div>
        </button>

        <button
          onClick={() => setActiveFocus('quality')}
          onMouseEnter={() => setHoveredFocus('quality')}
          onMouseLeave={() => setHoveredFocus(null)}
          className={`dashboard-focus-card rounded-xl border border-transparent bg-white p-4 text-left shadow transition-all hover:-translate-y-0.5 ${hoveredFocus === 'quality' ? 'is-focus-hover' : ''}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Data Quality</div>
          <div className="mt-2 text-3xl font-bold text-amber-600">{missingDataVisitors.length}</div>
          <div className="mt-1 text-sm text-gray-600">Butuh dilengkapi</div>
        </button>

        <button
          onClick={() => setActiveFocus('reminder')}
          onMouseEnter={() => setHoveredFocus('reminder')}
          onMouseLeave={() => setHoveredFocus(null)}
          className={`dashboard-focus-card rounded-xl border border-transparent bg-white p-4 text-left shadow transition-all hover:-translate-y-0.5 ${hoveredFocus === 'reminder' ? 'is-focus-hover' : ''}`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Siap Kirim WA</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{readyWaVisitors.length}</div>
          <div className="mt-1 text-sm text-gray-600">Siap dikirim WA</div>
        </button>
      </div>

      {readyWaVisitors.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">List Siap Kirim WA</h3>
            <button onClick={() => router.push(getChapterRoute('visitors', currentUser))} className="text-xs font-semibold text-red-600 hover:text-red-700">
              Buka Visitor →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {readyWaVisitors.slice(0, 6).map(visitor => (
              <button
                key={visitor.id}
                onClick={() => handleOpenDetail(visitor)}
                className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-100/70"
              >
                <div className="text-sm font-semibold text-gray-900">{visitor.name}</div>
                <div className="mt-1 text-xs text-gray-500">{visitor.phone}</div>
                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  {visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'PIC sudah dipilih'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Conversion Funnel</h3>
            <p className="mt-1 text-xs text-gray-500">Alur visitor dari masuk sampai jadi member</p>
          </div>
          <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            {funnelSteps[4].count} member
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {funnelSteps.map((step, index) => {
            const pct = Math.round((step.count / funnelBase) * 100)

            return (
              <button
                key={step.label}
                onClick={() => {
                  const statusMap: Record<string, string[]> = {
                    Visitor: [],
                    Confirmed: ['confirmed'],
                    Hadir: ['attended', 'interview', 'member', 'not_continue'],
                    Member: ['member'],
                  }
                  const statuses = statusMap[step.label] || []
                  openInsightList({
                    title: step.label,
                    subtitle: `Visitor pada tahap ${step.label}`,
                    visitors: step.label === 'Airtime Qualified'
                      ? airtimeQualifiedVisitors
                      : statuses.length ? filteredVisitors.filter(visitor => statuses.includes(visitor.status)) : filteredVisitors,
                    accent: 'text-red-600',
                    meta: visitor => {
                      const choice = Number((visitor as any).attended_choice_number)
                      if (step.label === 'Airtime Qualified') return visitor.pic_name ? `Qualified Airtime • PIC: ${visitor.pic_name}` : 'Qualified Airtime'
                      if (step.label === 'Hadir' && choice === 2) return 'Pikir-pikir dulu'
                      if (step.label === 'Hadir' && choice === 3) return 'Tidak tertarik'
                      return visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'Belum ada PIC'
                    },
                  })
                }}
                className="rounded-xl border border-gray-100 bg-white/75 p-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/70"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{index + 1}. {step.label}</span>
                  <span className="text-xs font-bold text-gray-500">{pct}%</span>
                </div>
                <div className="mt-2 text-2xl font-black text-gray-950">{step.count}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${step.color}`}
                    style={{ width: `${Math.max(pct, step.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Meeting Trend */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Visitor per Weekly Meeting</h3>
              <p className="mt-1 text-xs text-gray-500">Trend jumlah visitor per sesi meeting</p>
            </div>
            <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              {meetingTrendData.reduce((sum, item) => sum + item.count, 0)} total
            </div>
          </div>
          {meetingTrendPoints.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/70 text-sm font-medium text-gray-500">
              Belum ada data meeting
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white/55">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[220px] w-full" role="img" aria-label="Grafik jumlah visitor per weekly meeting">
                <defs>
                  <linearGradient id="meetingLineGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#fdba74" />
                    <stop offset="52%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#fca5a5" />
                  </linearGradient>
                  <linearGradient id="meetingAreaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#fecaca" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {[0, 0.5, 1].map(value => {
                  const y = chartPadding.top + chartInnerHeight - value * chartInnerHeight
                  return (
                    <g key={value}>
                      <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 6" />
                      <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px] font-semibold">
                        {Math.round(meetingTrendMax * value)}
                      </text>
                    </g>
                  )
                })}

                {meetingTrendAreaPath && <path d={meetingTrendAreaPath} fill="url(#meetingAreaGradient)" />}
                {meetingTrendPath && (
                  <path
                    d={meetingTrendPath}
                    fill="none"
                    stroke="url(#meetingLineGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {meetingTrendPoints.map(point => {
                  const tooltipWidth = 128
                  const tooltipHeight = 54
                  const tooltipX = Math.min(
                    Math.max(point.x - tooltipWidth / 2, chartPadding.left),
                    chartWidth - chartPadding.right - tooltipWidth
                  )
                  const tooltipY = Math.max(point.y - 76, 8)

                  return (
                    <g
                      key={point.id}
                      className="meeting-trend-node cursor-pointer"
                      onClick={() => openInsightList({
                        title: point.title,
                        subtitle: `${new Date(point.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - ${point.mode}`,
                        visitors: filteredVisitors.filter(visitor => visitor.meeting_id === point.id || visitor.meeting_date === point.date),
                        accent: 'text-orange-600',
                        meta: visitor => visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'Belum ada PIC',
                      })}
                    >
                      <title>{`${point.mode} meeting - ${point.count} visitor`}</title>
                      <circle cx={point.x} cy={point.y} r="14" fill="transparent" />
                      <circle cx={point.x} cy={point.y} r="6" fill="#fff7ed" stroke="#fb923c" strokeWidth="3" />
                      <text x={point.x} y={point.y - 13} textAnchor="middle" className="fill-gray-700 text-[11px] font-bold">
                        {point.count}
                      </text>
                      <text x={point.x} y={chartHeight - 17} textAnchor="middle" className="fill-gray-500 text-[10px] font-semibold">
                        {new Date(point.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </text>
                      <g className="meeting-trend-tooltip pointer-events-none">
                        <rect
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipWidth}
                          height={tooltipHeight}
                          rx="14"
                          fill="rgba(255,255,255,0.96)"
                          stroke="#fed7aa"
                          strokeWidth="1"
                        />
                        <text x={tooltipX + 14} y={tooltipY + 21} className="fill-gray-500 text-[10px] font-bold uppercase tracking-wide">
                          Weekly Meeting
                        </text>
                        <text x={tooltipX + 14} y={tooltipY + 39} className="fill-gray-900 text-[13px] font-black">
                          {point.mode}
                        </text>
                        <text x={tooltipX + tooltipWidth - 14} y={tooltipY + 39} textAnchor="end" className="fill-orange-600 text-[12px] font-bold">
                          {point.count} visitor
                        </text>
                      </g>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Top Industry */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Industri</h3>
          <div className="space-y-3">
            {topIndustryDist.length > 0 ? topIndustryDist.map(([industry, count]) => (
              <button
                key={industry}
                onClick={() => openInsightList({
                  title: industry,
                  subtitle: 'Visitor dari industri ini',
                  visitors: filteredVisitors.filter(visitor => (visitor.business_field || 'Lainnya') === industry),
                  accent: 'text-orange-600',
                  meta: visitor => visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'Belum ada PIC',
                })}
                className="flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-orange-50/70"
              >
                <div className="w-24 text-xs text-gray-600 truncate">{industry}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(count / maxIndustryCount) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs font-semibold">{count}</div>
              </button>
            )) : (
              <div className="py-12 text-center text-sm text-gray-500">Belum ada data industri</div>
            )}
          </div>
        </div>

        {/* Row 2: Top Diajak Oleh - Horizontal Bars (Full Width) */}
        <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🏆</span>
            Top Visitor Brought
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-3">
            {sortedReferrerDist.length > 0 ? (
              referrerColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-3">
                  {column.map(([name, count]) => (
                    <button
                      key={name}
                      onClick={() => openInsightList({
                        title: name,
                        subtitle: 'Visitor yang dibawa oleh member ini',
                        visitors: filteredVisitors.filter(visitor => visitor.status !== 'no_show' && (visitor as any).referred_by_member_name === name),
                        accent: 'text-orange-600',
                        meta: visitor => visitor.pic_name ? `PIC: ${visitor.pic_name}` : 'Belum ada PIC',
                      })}
                      className="flex w-full items-center gap-4 rounded-lg text-left transition-colors hover:bg-orange-50/70"
                    >
                      <div className="w-40 text-xs text-gray-600 truncate">{name}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-300 via-orange-400 to-red-300 transition-all duration-500"
                          style={{ width: `${(count / maxReferrerCount) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-xs font-semibold">{count}</div>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 text-sm py-12 xl:col-span-2">
                Belum ada data referral
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Visitors Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-800">Visitor Terbaru</h3>
          <button 
            onClick={() => router.push(getChapterRoute('visitors', currentUser))}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Lihat Semua →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-600">
                <th className="text-left font-medium px-4 py-3">Nama</th>
                <th className="text-left font-medium px-4 py-3">Bidang Usaha</th>
                <th className="text-left font-medium px-4 py-3">No WA</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentVisitors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                    Belum ada visitor. Klik &quot;Tambah Visitor&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                recentVisitors.map((visitor) => (
                  <tr
                    key={visitor.id}
                    onClick={() => handleOpenDetail(visitor)}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{visitor.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{visitor.business_field || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{visitor.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(visitor.status)}`}>
                        {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeListModal && (
        <div className="app-modal-backdrop fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Dashboard Focus</div>
                <h3 className="mt-1 text-xl font-bold text-gray-950">{activeListModal.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{activeListModal.subtitle}</p>
              </div>
              <button
                onClick={() => {
                  setActiveFocus(null)
                  setActiveInsight(null)
                }}
                className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Tutup daftar focus"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div className="text-sm font-semibold text-gray-700">Data yang ditampilkan</div>
                <div className={`text-2xl font-black ${activeListModal.accent}`}>{activeListModal.visitors.length}</div>
              </div>

              {activeListModal.visitors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-10 text-center text-sm font-medium text-gray-500">
                  {activeListModal.empty}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
                  {activeListModal.visitors.map(visitor => (
                    <button
                      key={visitor.id}
                      onClick={() => handleOpenDetail(visitor)}
                      className="grid w-full grid-cols-1 gap-3 bg-white px-4 py-4 text-left transition-colors hover:bg-red-50/50 md:grid-cols-[1.2fr_1fr_0.9fr_auto]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-950">{visitor.name}</div>
                        <div className="mt-1 truncate text-xs text-gray-500">{visitor.company || visitor.business_field || '-'}</div>
                      </div>
                      <div className="min-w-0 text-sm text-gray-600">
                        <div className="truncate">{visitor.phone || '-'}</div>
                        <div className="mt-1 truncate text-xs text-gray-400">{visitor.email || 'Email belum ada'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(visitor.status)}`}>
                          {STATUSES[visitor.status as keyof typeof STATUSES]?.label || visitor.status}
                        </span>
                        <span className="text-xs font-medium text-gray-500">{activeListModal.meta ? activeListModal.meta(visitor) : getFocusMeta(visitor)}</span>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm">
                        Detail
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedVisitor && (
        <VisitorDetail
          visitor={selectedVisitor}
          onClose={handleCloseDetail}
          onSaved={async (savedVisitor) => {
            setSelectedVisitor(savedVisitor)
            await reload()
          }}
          onEdit={() => {
            setSelectedVisitor(null)
            router.push(getChapterRoute('visitors', currentUser))
          }}
        />
      )}
    </div>
  )
}
