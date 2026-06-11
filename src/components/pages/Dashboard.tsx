'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData, VisitorWithRelations } from '@/hooks/useData'
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

export default function Dashboard() {
  const router = useRouter()
  const { getIndustryDistribution, getReferrerDistribution, visitors, meetings, reload } = useData()
  
  // Filter state
  const [meetingFilter, setMeetingFilter] = useState<string>('')
  const [activeFocus, setActiveFocus] = useState<'followup' | 'unassigned' | 'quality' | 'reminder' | null>(null)
  const [activeInsight, setActiveInsight] = useState<DashboardListModal | null>(null)
  const [hoveredFocus, setHoveredFocus] = useState<'followup' | 'unassigned' | 'quality' | 'reminder' | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorWithRelations | null>(null)
  
  // Filter visitors by meeting if selected
  const filteredVisitors = meetingFilter 
    ? visitors.filter(v => v.meeting_id === meetingFilter)
    : visitors
  
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
  
  const industryDist = getIndustryDistribution()
  const filteredIndustryDist = meetingFilter
    ? (() => {
        const dist: Record<string, number> = {}
        filteredVisitors.forEach(v => {
          const field = v.business_field || 'Lainnya'
          dist[field] = (dist[field] || 0) + 1
        })
        return Object.entries(dist).sort((a, b) => b[1] - a[1]) as [string, number][]
      })()
    : industryDist
  const topIndustryDist = filteredIndustryDist.slice(0, 10)

  const referrerDist = getReferrerDistribution()
  const filteredReferrerDist = meetingFilter
    ? (() => {
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
    : referrerDist

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

    visitors.forEach(visitor => {
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
            <button onClick={() => router.push('/visitors')} className="text-xs font-semibold text-red-600 hover:text-red-700">
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
            onClick={() => router.push('/visitors')}
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
            router.push('/visitors')
          }}
        />
      )}
    </div>
  )
}
