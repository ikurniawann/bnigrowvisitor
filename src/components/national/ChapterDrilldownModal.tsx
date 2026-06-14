'use client'

import { useRouter } from 'next/navigation'
import type { ChapterReport } from '@/lib/national/types'
import { toneClasses, formatRelativeDate } from '@/lib/national/format'

interface ChapterDrilldownModalProps {
  chapter: ChapterReport
  now: number
  onClose: () => void
}

const COMPONENT_LABELS: { key: keyof ChapterReport['health']['components']; label: string }[] = [
  { key: 'attendance', label: 'Kehadiran' },
  { key: 'conversion', label: 'Konversi Member' },
  { key: 'dataQuality', label: 'Kualitas Data' },
  { key: 'picCoverage', label: 'Coverage PIC' },
  { key: 'meeting', label: 'Meeting Rutin' },
]

export default function ChapterDrilldownModal({ chapter, now, onClose }: ChapterDrilldownModalProps) {
  const router = useRouter()
  const tone = toneClasses(chapter.health.tone)
  const { stats } = chapter

  const openChapterDashboard = () => {
    localStorage.setItem(
      'selectedChapterContext',
      JSON.stringify({
        chapter: { id: chapter.id, name: chapter.name, display_name: chapter.displayName },
        area: chapter.areaName ? { id: chapter.areaId, name: chapter.areaName } : null,
        city: chapter.cityName ? { id: chapter.cityId, name: chapter.cityName } : null,
      })
    )
    router.push(`/chapter/${encodeURIComponent(chapter.id)}/dashboard`)
  }

  const summaryStats = [
    { label: 'Total Visitor', value: stats.totalVisitors },
    { label: 'Hadir', value: stats.attended },
    { label: 'Airtime Qualified', value: stats.airtimeQualified },
    { label: 'Member', value: stats.members },
    { label: 'Belum ada PIC', value: stats.unassigned },
    { label: 'PIC Aktif', value: stats.picCount },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-400">{chapter.cityName} / {chapter.areaName}</div>
            <h2 className="mt-1 truncate text-xl font-black text-gray-950">{chapter.displayName}</h2>
            {!chapter.isActive && (
              <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">Nonaktif</span>
            )}
          </div>
          <div className={`flex flex-col items-center rounded-2xl px-4 py-2 ${tone.soft}`}>
            <span className={`text-3xl font-black ${tone.text}`}>{chapter.health.score}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}>{chapter.health.grade} · {chapter.health.label}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {summaryStats.map(item => (
            <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 text-center">
              <div className="text-lg font-black text-gray-950">{item.value}</div>
              <div className="mt-0.5 text-[11px] font-medium text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-black text-gray-950">Komponen Health Score</h3>
          <div className="mt-3 space-y-2.5">
            {COMPONENT_LABELS.map(({ key, label }) => {
              const value = Math.round(chapter.health.components[key])
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600">{label}</span>
                    <span className="font-bold text-gray-900">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${toneClasses(chapter.health.tone).bar}`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-950">Target &amp; KPI</h3>
            <span className="text-[11px] font-semibold text-gray-400">
              {chapter.kpis.filter(k => k.met).length}/{chapter.kpis.length} tercapai{chapter.targetIsOverride ? ' · override' : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {chapter.kpis.map(kpi => (
              <div key={kpi.key} className="rounded-2xl border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-500">{kpi.label}</span>
                  <span className={`text-[10px] font-bold ${kpi.met ? 'text-emerald-600' : 'text-orange-500'}`}>{kpi.met ? '✓ tercapai' : 'belum'}</span>
                </div>
                <div className="mt-1 text-sm font-black text-gray-900">
                  {kpi.actual}{kpi.unit} <span className="text-[11px] font-medium text-gray-400">/ {kpi.target}{kpi.unit}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${kpi.met ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${kpi.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-gray-100 p-3">
            <div className="font-medium text-gray-500">Meeting terakhir</div>
            <div className="mt-0.5 font-bold text-gray-900">{formatRelativeDate(stats.lastMeetingDate, now)}</div>
          </div>
          <div className="rounded-2xl border border-gray-100 p-3">
            <div className="font-medium text-gray-500">Aktivitas terakhir</div>
            <div className="mt-0.5 font-bold text-gray-900">{formatRelativeDate(stats.lastActivityAt, now)}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={openChapterDashboard}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Buka Dashboard Chapter →
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
