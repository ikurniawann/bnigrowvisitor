'use client'

export type WaTemplateMode = 'online' | 'offline'

export interface WaTemplateSettings {
  activeMode: WaTemplateMode
  templates: Record<WaTemplateMode, string>
}

export interface WaTemplateVariables {
  sapaan?: string
  nama?: string
  pic?: string
  pic_nama?: string
  pic_bisnis?: string
  diajak_oleh?: string
  tanggal_meeting?: string
  jam_meeting?: string
  chapter?: string
  bidang_usaha?: string
  perusahaan?: string
  link_hadir?: string
}

const STORAGE_KEY = 'bni-grow-wa-template-settings'

export const DEFAULT_WA_TEMPLATES: Record<WaTemplateMode, string> = {
  online: `Selamat Siang {sapaan} {nama},

Perkenalkan saya {pic_nama} Visitor Host {chapter} dengan bisnis {pic_bisnis}
Chapter {chapter}.

Anda diundang oleh Bapak/Ibu {diajak_oleh} untuk ikut weekly
meeting {chapter} besok:
{tanggal_meeting}
Pagi jam {jam_meeting} WIB

Mohon konfirmasi kehadiran {sapaan} {nama} dengan klik link berikut:
{link_hadir}

Konfirmasi kehadiran ini penting untuk menentukan pembagian
room/seat saat open networking.

Terima kasih,
Visitor Host {chapter}`,
  offline: `Selamat Siang {sapaan} {nama},

Perkenalkan saya {pic_nama} Visitor Host {chapter} dengan bisnis {pic_bisnis}
Chapter {chapter}.

Anda diundang oleh Bapak/Ibu {diajak_oleh} untuk ikut weekly
meeting {chapter}:
{tanggal_meeting}
Pagi jam {jam_meeting} WIB

Meeting akan dilaksanakan secara offline di [Lokasi Meeting].

Mohon konfirmasi kehadiran {sapaan} {nama} dengan klik link berikut:
{link_hadir}

Konfirmasi kehadiran ini penting untuk menentukan pembagian
seat saat open networking.

Terima kasih,
Visitor Host {chapter}`,
}

export const DEFAULT_WA_TEMPLATE_SETTINGS: WaTemplateSettings = {
  activeMode: 'online',
  templates: DEFAULT_WA_TEMPLATES,
}

export const WA_TEMPLATE_VARIABLES = [
  '{sapaan}',
  '{nama}',
  '{pic}',
  '{pic_nama}',
  '{pic_bisnis}',
  '{diajak_oleh}',
  '{tanggal_meeting}',
  '{jam_meeting}',
  '{chapter}',
  '{bidang_usaha}',
  '{perusahaan}',
  '{link_hadir}',
]

function normalizeTemplate(template: string, fallback: string) {
  return (template || fallback)
    .replace(/saya XXX/g, 'saya {pic_nama}')
    .replace(/bisnis XXX/g, 'bisnis {pic_bisnis}')
    .replace(/Visitor Host BNI\s+[A-Za-z]+ dengan bisnis/g, 'Visitor Host {chapter} dengan bisnis')
    .replace(/Visitor Host BNI\s+[A-Za-z]+ bisnis/g, 'Visitor Host {chapter} dengan bisnis')
    .replace(/meeting BNI\s+[A-Za-z]+ besok:/g, 'meeting {chapter} besok:')
    .replace(/meeting BNI\s+[A-Za-z]+:/g, 'meeting {chapter}:')
    .replace(/Visitor Host BNI\s+[A-Za-z]+\.?/g, 'Visitor Host {chapter}')
    .replace(/Visitor Host \{chapter\}\s+[A-Za-z]+\.?/g, 'Visitor Host {chapter}')
    .replace(/Visitor Host \{chapter\} bisnis/g, 'Visitor Host {chapter} dengan bisnis')
    .replace(/Visitor Host BNI Grow\s+[A-Za-z]+\.?/g, 'Visitor Host {chapter}')
    .replace(/Chapter Jakarta\./g, 'Chapter {chapter}.')
    .replace(/Visitor Host BNI Grow dengan bisnis/g, 'Visitor Host {chapter} dengan bisnis')
    .replace(/meeting BNI Grow besok:/g, 'meeting {chapter} besok:')
    .replace(/meeting BNI Grow:/g, 'meeting {chapter}:')
    .replace(/Visitor Host BNI Grow Jakarta/g, 'Visitor Host {chapter}')
    .replace(/BNI Grow/g, '{chapter}')
}

export function getWaTemplateSettings(): WaTemplateSettings {
  if (typeof window === 'undefined') return DEFAULT_WA_TEMPLATE_SETTINGS

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WA_TEMPLATE_SETTINGS

    const parsed = JSON.parse(raw) as Partial<WaTemplateSettings>
    const activeMode = parsed.activeMode === 'offline' ? 'offline' : 'online'

    return {
      activeMode,
      templates: {
        online: normalizeTemplate(parsed.templates?.online || '', DEFAULT_WA_TEMPLATES.online),
        offline: normalizeTemplate(parsed.templates?.offline || '', DEFAULT_WA_TEMPLATES.offline),
      },
    }
  } catch {
    return DEFAULT_WA_TEMPLATE_SETTINGS
  }
}

export function saveWaTemplateSettings(settings: WaTemplateSettings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function renderWaTemplate(template: string, variables: WaTemplateVariables) {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: keyof WaTemplateVariables) => {
    return variables[key] || match
  })
}
