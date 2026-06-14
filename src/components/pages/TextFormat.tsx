'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_WA_TEMPLATE_SETTINGS,
  DEFAULT_WA_TEMPLATES,
  WA_TEMPLATE_VARIABLES,
  WaTemplateMode,
  WaTemplateSettings,
  getWaTemplateSettings,
  renderWaTemplate,
  saveWaTemplateSettings,
} from '@/lib/waTemplate'
import { showToast } from '@/lib/ui/toast'
import { useChapterBranding } from '@/hooks/useChapterBranding'

const sampleValues = {
  sapaan: 'Bapak',
  nama: 'Hartono Hartono',
  pic: 'Ilham',
  pic_nama: 'Ilham',
  pic_bisnis: 'IT, Software Development - WIT.ID',
  diajak_oleh: 'Widjanarka Budhihardjo',
  tanggal_meeting: 'Kamis, 11 Juni 2026',
  jam_meeting: '07.30 - 10.15',
  chapter: 'Grow',
  bidang_usaha: 'Legal & Accounting',
  perusahaan: 'Agung trans solusindo',
  link_hadir: 'https://grow.bni-vh.com/wm/abc123-contoh',
}

const modeLabels: Record<WaTemplateMode, string> = {
  online: 'Online Meeting',
  offline: 'Offline Meeting',
}

export default function TextFormat() {
  const [settings, setSettings] = useState<WaTemplateSettings>(DEFAULT_WA_TEMPLATE_SETTINGS)
  const [selectedMode, setSelectedMode] = useState<WaTemplateMode>('online')
  const chapterBranding = useChapterBranding()

  useEffect(() => {
    const stored = getWaTemplateSettings()
    setSettings(stored)
    setSelectedMode(stored.activeMode)
  }, [])

  const previewText = useMemo(() => {
    return renderWaTemplate(settings.templates[selectedMode], {
      ...sampleValues,
      chapter: chapterBranding.chapterName,
    })
  }, [chapterBranding.chapterName, selectedMode, settings.templates])

  const updateTemplate = (mode: WaTemplateMode, value: string) => {
    setSettings(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [mode]: value,
      },
    }))
  }

  const setActiveMode = (mode: WaTemplateMode) => {
    setSelectedMode(mode)
    const nextSettings = {
      ...settings,
      activeMode: mode,
    }
    setSettings(nextSettings)
    saveWaTemplateSettings(nextSettings)
    showToast({
      title: `${modeLabels[mode]} diaktifkan`,
      description: 'Klik nomor WhatsApp visitor akan memakai format ini.',
      variant: 'success',
    })
  }

  const saveSettings = () => {
    saveWaTemplateSettings(settings)
    showToast({
      title: 'Format WA berhasil disimpan',
      description: `Mode aktif: ${modeLabels[settings.activeMode]}.`,
      variant: 'success',
    })
  }

  const resetTemplate = () => {
    const nextSettings = {
      ...settings,
      templates: {
        ...settings.templates,
        [selectedMode]: DEFAULT_WA_TEMPLATES[selectedMode],
      },
    }
    setSettings(nextSettings)
    saveWaTemplateSettings(nextSettings)
    showToast({
      title: 'Template dikembalikan ke default',
      description: `${modeLabels[selectedMode]} sudah memakai format bawaan.`,
      variant: 'info',
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Format Text WA</h2>
            <p className="mt-1 text-sm text-gray-500">Template yang dipakai saat nomor WhatsApp di detail visitor diklik.</p>
          </div>

          <div className="inline-grid grid-cols-2 gap-2 rounded-2xl bg-gray-100/80 p-1">
            {(['online', 'offline'] as WaTemplateMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  settings.activeMode === mode
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-950'
                }`}
              >
                {modeLabels[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-5">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-grid grid-cols-2 gap-2 rounded-2xl bg-gray-100/80 p-1">
              {(['online', 'offline'] as WaTemplateMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  selectedMode === mode
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>

            <button
              onClick={resetTemplate}
              className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Reset Default
            </button>
          </div>

          <textarea
            value={settings.templates[selectedMode]}
            onChange={(event) => updateTemplate(selectedMode, event.target.value)}
            className="min-h-[520px] w-full resize-y rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-900 shadow-sm focus:border-red-300 focus:ring-4 focus:ring-red-100"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {WA_TEMPLATE_VARIABLES.map(variable => (
              <span key={variable} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {variable}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
              <p className="mt-1 text-xs text-gray-500">{modeLabels[selectedMode]}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              settings.activeMode === selectedMode
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {settings.activeMode === selectedMode ? 'Aktif' : 'Draft'}
            </span>
          </div>

          <div className="min-h-[520px] whitespace-pre-wrap rounded-2xl border border-gray-200 bg-gray-50/80 p-4 text-sm leading-6 text-gray-800">
            {previewText}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={saveSettings}
              className="app-primary-button h-11 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Simpan Format
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
