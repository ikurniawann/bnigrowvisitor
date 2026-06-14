import type { AlertSeverity } from './config'

// Tailwind needs literal class names, so tones map to full class strings rather
// than interpolated fragments.
export interface ToneClasses {
  badge: string
  text: string
  bar: string
  ring: string
  soft: string
}

const TONE_CLASSES: Record<string, ToneClasses> = {
  emerald: {
    badge: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500',
    ring: 'ring-emerald-200',
    soft: 'bg-emerald-50',
  },
  green: {
    badge: 'bg-green-100 text-green-800',
    text: 'text-green-600',
    bar: 'bg-green-500',
    ring: 'ring-green-200',
    soft: 'bg-green-50',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
    ring: 'ring-amber-200',
    soft: 'bg-amber-50',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-800',
    text: 'text-orange-600',
    bar: 'bg-orange-500',
    ring: 'ring-orange-200',
    soft: 'bg-orange-50',
  },
  red: {
    badge: 'bg-red-100 text-red-800',
    text: 'text-red-600',
    bar: 'bg-red-500',
    ring: 'ring-red-200',
    soft: 'bg-red-50',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700',
    text: 'text-slate-600',
    bar: 'bg-slate-400',
    ring: 'ring-slate-200',
    soft: 'bg-slate-50',
  },
}

export function toneClasses(tone: string): ToneClasses {
  return TONE_CLASSES[tone] || TONE_CLASSES.slate
}

const SEVERITY_TONE: Record<AlertSeverity, string> = {
  critical: 'red',
  warning: 'amber',
  info: 'slate',
}

export function severityTone(severity: AlertSeverity): string {
  return SEVERITY_TONE[severity] || 'slate'
}

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Kritis',
  warning: 'Perhatian',
  info: 'Info',
}

export function formatRelativeDate(iso: string | null, now: number): string {
  if (!iso) return 'Belum ada'
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return 'Belum ada'
  const days = Math.floor((now - time) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Hari ini'
  if (days === 1) return 'Kemarin'
  if (days < 30) return `${days} hari lalu`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} bulan lalu`
  return `${Math.floor(months / 12)} tahun lalu`
}
