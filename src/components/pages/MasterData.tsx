'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { User } from '@/lib/supabase'
import { isNationalAdmin } from '@/lib/permissions'
import { notifyDataChanged } from '@/lib/ui/toast'

type TabKey = 'cities' | 'areas' | 'chapters' | 'domains' | 'admins'

type Organization = { id: string; name: string }
type City = { id: string; organization_id: string; name: string; is_active: boolean; organization?: Organization }
type Area = { id: string; city_id: string; name: string; is_active: boolean; city?: City }
type Chapter = { id: string; area_id: string; name: string; display_name: string; is_active: boolean; area?: Area }
type ChapterDomain = { id: string; chapter_id: string; domain: string; type: string; is_primary: boolean; is_active: boolean; chapter?: Chapter }
type ChapterAdmin = { id: string; name: string; email: string; phone?: string; chapter_id?: string; is_active: boolean; chapter?: Chapter }

const tabs: { id: TabKey; label: string; description: string }[] = [
  { id: 'cities', label: 'Kota', description: 'Master kota di bawah BNI Indonesia.' },
  { id: 'areas', label: 'Area', description: 'Area dikelompokkan per kota.' },
  { id: 'chapters', label: 'Chapter', description: 'Chapter operasional per area.' },
  { id: 'domains', label: 'Domain', description: 'Mapping domain/subdomain ke chapter.' },
  { id: 'admins', label: 'Chapter Admin', description: 'Akun admin per chapter.' },
]

const inputClass = 'h-11 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100'
const selectClass = `${inputClass} appearance-none`

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null

  try {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-8 text-center text-sm text-gray-500">
      Belum ada data {label}.
    </div>
  )
}

export default function MasterData({
  defaultTab = 'cities',
  title = 'Master SaaS',
  subtitle = 'Kelola struktur Kota, Area, Chapter, dan domain untuk multi-chapter.',
  visibleTabs,
}: {
  defaultTab?: TabKey
  title?: string
  subtitle?: string
  visibleTabs?: TabKey[]
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [domains, setDomains] = useState<ChapterDomain[]>([])
  const [admins, setAdmins] = useState<ChapterAdmin[]>([])
  const [cityForm, setCityForm] = useState({ id: '', organization_id: '', name: '' })
  const [areaForm, setAreaForm] = useState({ id: '', city_id: '', name: '' })
  const [chapterForm, setChapterForm] = useState({ id: '', area_id: '', name: '', display_name: '' })
  const [domainForm, setDomainForm] = useState({ id: '', chapter_id: '', domain: '', type: 'subdomain', is_primary: false })
  const [adminForm, setAdminForm] = useState({ id: '', chapter_id: '', name: '', email: '', phone: '', password: '' })

  const isAllowed = isNationalAdmin(currentUser)
  const defaultOrgId = organizations[0]?.id || ''

  useEffect(() => {
    const storedUser = getStoredUser()
    setCurrentUser(storedUser)
    loadMasterData()
  }, [])

  useEffect(() => {
    if (!cityForm.organization_id && defaultOrgId) {
      setCityForm(prev => ({ ...prev, organization_id: defaultOrgId }))
    }
  }, [cityForm.organization_id, defaultOrgId])

  const cityById = useMemo(() => new Map(cities.map(city => [city.id, city])), [cities])
  const areaById = useMemo(() => new Map(areas.map(area => [area.id, area])), [areas])
  const chapterById = useMemo(() => new Map(chapters.map(chapter => [chapter.id, chapter])), [chapters])
  const visibleTabItems = visibleTabs ? tabs.filter(tab => visibleTabs.includes(tab.id)) : tabs

  function getUserId() {
    const user = currentUser || getStoredUser()
    return user?.id || ''
  }

  async function masterRequest(body: Record<string, any>) {
    const response = await fetch('/api/master-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, userId: getUserId() }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.error || 'Gagal menyimpan master data.')
    return data
  }

  async function loadMasterData() {
    try {
      setLoading(true)
      setError('')

      const user = getStoredUser()
      const response = await fetch(`/api/master-data?userId=${encodeURIComponent(user?.id || '')}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Gagal memuat master data.')

      setOrganizations((data.organizations || []) as Organization[])
      setCities((data.cities || []) as any)
      setAreas((data.areas || []) as any)
      setChapters((data.chapters || []) as any)
      setDomains((data.domains || []) as any)
      setAdmins((data.admins || []) as any)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat master data.')
    } finally {
      setLoading(false)
    }
  }

  function resetForms() {
    setCityForm({ id: '', organization_id: defaultOrgId, name: '' })
    setAreaForm({ id: '', city_id: '', name: '' })
    setChapterForm({ id: '', area_id: '', name: '', display_name: '' })
    setDomainForm({ id: '', chapter_id: '', domain: '', type: 'subdomain', is_primary: false })
    setAdminForm({ id: '', chapter_id: '', name: '', email: '', phone: '', password: '' })
  }

  async function saveCity(event: FormEvent) {
    event.preventDefault()
    if (!cityForm.name.trim() || !cityForm.organization_id) return
    setSaving(true)
    try {
      if (cityForm.id) {
        await masterRequest({
          action: 'upsert',
          table: 'cities',
          id: cityForm.id,
          payload: { name: cityForm.name.trim(), organization_id: cityForm.organization_id },
        })
        notifyDataChanged('update')
      } else {
        await masterRequest({
          action: 'upsert',
          table: 'cities',
          payload: { name: cityForm.name.trim(), organization_id: cityForm.organization_id },
        })
        notifyDataChanged('insert')
      }
      resetForms()
      await loadMasterData()
    } finally {
      setSaving(false)
    }
  }

  async function saveArea(event: FormEvent) {
    event.preventDefault()
    if (!areaForm.name.trim() || !areaForm.city_id) return
    setSaving(true)
    try {
      if (areaForm.id) {
        await masterRequest({
          action: 'upsert',
          table: 'areas',
          id: areaForm.id,
          payload: { name: areaForm.name.trim(), city_id: areaForm.city_id },
        })
        notifyDataChanged('update')
      } else {
        await masterRequest({
          action: 'upsert',
          table: 'areas',
          payload: { name: areaForm.name.trim(), city_id: areaForm.city_id },
        })
        notifyDataChanged('insert')
      }
      resetForms()
      await loadMasterData()
    } finally {
      setSaving(false)
    }
  }

  async function saveChapter(event: FormEvent) {
    event.preventDefault()
    if (!chapterForm.name.trim() || !chapterForm.display_name.trim() || !chapterForm.area_id) return
    setSaving(true)
    try {
      const payload = {
        name: chapterForm.name.trim(),
        display_name: chapterForm.display_name.trim(),
        area_id: chapterForm.area_id,
        updated_at: new Date().toISOString(),
      }

      if (chapterForm.id) {
        await masterRequest({ action: 'upsert', table: 'chapters', id: chapterForm.id, payload })
        notifyDataChanged('update')
      } else {
        await masterRequest({ action: 'upsert', table: 'chapters', payload })
        notifyDataChanged('insert')
      }
      resetForms()
      await loadMasterData()
    } finally {
      setSaving(false)
    }
  }

  async function saveDomain(event: FormEvent) {
    event.preventDefault()
    if (!domainForm.domain.trim() || !domainForm.chapter_id) return
    setSaving(true)
    try {
      const payload = {
        chapter_id: domainForm.chapter_id,
        domain: domainForm.domain.trim().toLowerCase(),
        type: domainForm.type,
        is_primary: domainForm.is_primary,
        updated_at: new Date().toISOString(),
      }

      if (domainForm.id) {
        await masterRequest({ action: 'upsert', table: 'chapter_domains', id: domainForm.id, payload })
        notifyDataChanged('update')
      } else {
        await masterRequest({ action: 'upsert', table: 'chapter_domains', payload })
        notifyDataChanged('insert')
      }
      resetForms()
      await loadMasterData()
    } finally {
      setSaving(false)
    }
  }

  async function saveChapterAdmin(event: FormEvent) {
    event.preventDefault()
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.chapter_id) return
    if (!adminForm.id && !adminForm.password.trim()) {
      setError('Password wajib diisi untuk admin baru.')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, any> = {
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim() || null,
        role: 'chapter_admin',
        chapter_id: adminForm.chapter_id,
        organization_id: defaultOrgId || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      if (adminForm.password.trim()) {
        payload.password_hash = adminForm.password.trim()
      }

      if (adminForm.id) {
        await masterRequest({ action: 'upsert', table: 'users', id: adminForm.id, payload })
        notifyDataChanged('update')
      } else {
        await masterRequest({
          action: 'upsert',
          table: 'users',
          payload: {
          ...payload,
          password_hash: adminForm.password.trim(),
          },
        })
        notifyDataChanged('insert')
      }

      resetForms()
      await loadMasterData()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(table: 'cities' | 'areas' | 'chapters' | 'chapter_domains' | 'users', id: string, value: boolean) {
    setSaving(true)
    try {
      await masterRequest({
        action: 'toggle',
        table,
        id,
        payload: { is_active: !value },
      })
      notifyDataChanged('update')
      await loadMasterData()
    } finally {
      setSaving(false)
    }
  }

  function openChapterData(chapter: Chapter) {
    const area = areaById.get(chapter.area_id)
    const city = area ? cityById.get(area.city_id) : undefined

    localStorage.setItem('selectedChapterContext', JSON.stringify({
      chapter: {
        id: chapter.id,
        name: chapter.name,
        display_name: chapter.display_name,
      },
      area: area ? { id: area.id, name: area.name } : null,
      city: city ? { id: city.id, name: city.name } : null,
    }))

    window.location.href = `/chapter/${encodeURIComponent(chapter.id)}/dashboard`
  }

  if (!isAllowed) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-950">Akses Master Data Terbatas</h1>
        <p className="mt-2 text-sm text-gray-500">Hanya National Admin yang bisa mengelola Kota, Area, Chapter, dan Domain.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">BNI Indonesia</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <button
            onClick={loadMasterData}
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {visibleTabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              activeTab === tab.id
                ? 'border-orange-200 bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200/60'
                : 'border-white/70 bg-white/75 text-gray-700 shadow-sm hover:border-orange-200 hover:bg-orange-50'
            }`}
          >
            <div className="text-sm font-bold">{tab.label}</div>
            <div className={`mt-1 text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-gray-500'}`}>{tab.description}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/70 bg-white/75 p-10 text-center text-sm font-medium text-gray-500 shadow-sm">
          Loading master data...
        </div>
      ) : (
        <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
          {activeTab === 'cities' && (
            <div className="space-y-5">
              <form onSubmit={saveCity} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <select className={selectClass} value={cityForm.organization_id} onChange={event => setCityForm(prev => ({ ...prev, organization_id: event.target.value }))}>
                  {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
                <input className={inputClass} placeholder="Nama kota, contoh Jakarta" value={cityForm.name} onChange={event => setCityForm(prev => ({ ...prev, name: event.target.value }))} />
                <button disabled={saving} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
                  {cityForm.id ? 'Update Kota' : 'Tambah Kota'}
                </button>
              </form>

              {cities.length === 0 ? <EmptyState label="kota" /> : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {cities.map(city => (
                    <div key={city.id} className="grid gap-3 border-b border-gray-100 bg-white/70 p-4 last:border-b-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <div>
                        <div className="font-bold text-gray-950">{city.name}</div>
                        <div className="text-xs text-gray-500">{city.organization?.name || city.organization_id}</div>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${city.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {city.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setCityForm({ id: city.id, organization_id: city.organization_id, name: city.name })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => toggleActive('cities', city.id, city.is_active)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">{city.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'areas' && (
            <div className="space-y-5">
              <form onSubmit={saveArea} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <select className={selectClass} value={areaForm.city_id} onChange={event => setAreaForm(prev => ({ ...prev, city_id: event.target.value }))}>
                  <option value="">Pilih kota</option>
                  {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
                <input className={inputClass} placeholder="Nama area, contoh Jakarta Barat" value={areaForm.name} onChange={event => setAreaForm(prev => ({ ...prev, name: event.target.value }))} />
                <button disabled={saving} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
                  {areaForm.id ? 'Update Area' : 'Tambah Area'}
                </button>
              </form>

              {areas.length === 0 ? <EmptyState label="area" /> : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {areas.map(area => (
                    <div key={area.id} className="grid gap-3 border-b border-gray-100 bg-white/70 p-4 last:border-b-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <div>
                        <div className="font-bold text-gray-950">{area.name}</div>
                        <div className="text-xs text-gray-500">{area.city?.name || cityById.get(area.city_id)?.name || '-'}</div>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${area.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {area.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setAreaForm({ id: area.id, city_id: area.city_id, name: area.name })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => toggleActive('areas', area.id, area.is_active)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">{area.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chapters' && (
            <div className="space-y-5">
              <form onSubmit={saveChapter} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <select className={selectClass} value={chapterForm.area_id} onChange={event => setChapterForm(prev => ({ ...prev, area_id: event.target.value }))}>
                  <option value="">Pilih area</option>
                  {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select>
                <input className={inputClass} placeholder="Kode/nama chapter, contoh BNI Grow" value={chapterForm.name} onChange={event => setChapterForm(prev => ({ ...prev, name: event.target.value }))} />
                <input className={inputClass} placeholder="Display name, contoh BNI Grow Chapter" value={chapterForm.display_name} onChange={event => setChapterForm(prev => ({ ...prev, display_name: event.target.value }))} />
                <button disabled={saving} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
                  {chapterForm.id ? 'Update Chapter' : 'Tambah Chapter'}
                </button>
              </form>

              {chapters.length === 0 ? <EmptyState label="chapter" /> : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {chapters.map(chapter => (
                    <div key={chapter.id} className="grid gap-3 border-b border-gray-100 bg-white/70 p-4 last:border-b-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <div>
                        <div className="font-bold text-gray-950">{chapter.display_name}</div>
                        <div className="text-xs text-gray-500">{chapter.name} - {chapter.area?.name || areaById.get(chapter.area_id)?.name || '-'}</div>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${chapter.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {chapter.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openChapterData(chapter)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700">Buka Data</button>
                        <button onClick={() => setChapterForm({ id: chapter.id, area_id: chapter.area_id, name: chapter.name, display_name: chapter.display_name })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => toggleActive('chapters', chapter.id, chapter.is_active)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">{chapter.is_active ? 'Delete' : 'Restore'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="space-y-5">
              <form onSubmit={saveDomain} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
                <select className={selectClass} value={domainForm.chapter_id} onChange={event => setDomainForm(prev => ({ ...prev, chapter_id: event.target.value }))}>
                  <option value="">Pilih chapter</option>
                  {chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.display_name}</option>)}
                </select>
                <input className={inputClass} placeholder="domain/subdomain" value={domainForm.domain} onChange={event => setDomainForm(prev => ({ ...prev, domain: event.target.value }))} />
                <select className={selectClass} value={domainForm.type} onChange={event => setDomainForm(prev => ({ ...prev, type: event.target.value }))}>
                  <option value="subdomain">Subdomain</option>
                  <option value="custom_domain">Custom Domain</option>
                  <option value="localhost">Localhost</option>
                </select>
                <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm font-bold text-gray-700">
                  <input type="checkbox" checked={domainForm.is_primary} onChange={event => setDomainForm(prev => ({ ...prev, is_primary: event.target.checked }))} />
                  Primary
                </label>
                <button disabled={saving} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
                  {domainForm.id ? 'Update Domain' : 'Tambah Domain'}
                </button>
              </form>

              {domains.length === 0 ? <EmptyState label="domain" /> : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {domains.map(domain => (
                    <div key={domain.id} className="grid gap-3 border-b border-gray-100 bg-white/70 p-4 last:border-b-0 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
                      <div>
                        <div className="font-bold text-gray-950">{domain.domain}</div>
                        <div className="text-xs text-gray-500">{domain.type}{domain.is_primary ? ' - primary' : ''}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">{domain.chapter?.display_name || chapterById.get(domain.chapter_id)?.display_name || '-'}</div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${domain.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {domain.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setDomainForm({ id: domain.id, chapter_id: domain.chapter_id, domain: domain.domain, type: domain.type, is_primary: domain.is_primary })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => toggleActive('chapter_domains', domain.id, domain.is_active)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">{domain.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="space-y-5">
              <form onSubmit={saveChapterAdmin} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <select className={selectClass} value={adminForm.chapter_id} onChange={event => setAdminForm(prev => ({ ...prev, chapter_id: event.target.value }))}>
                  <option value="">Pilih chapter</option>
                  {chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.display_name}</option>)}
                </select>
                <input className={inputClass} placeholder="Nama admin" value={adminForm.name} onChange={event => setAdminForm(prev => ({ ...prev, name: event.target.value }))} />
                <input className={inputClass} placeholder="Email admin" value={adminForm.email} onChange={event => setAdminForm(prev => ({ ...prev, email: event.target.value }))} />
                <input className={inputClass} placeholder={adminForm.id ? 'Password baru opsional' : 'Password'} type="password" value={adminForm.password} onChange={event => setAdminForm(prev => ({ ...prev, password: event.target.value }))} />
                <button disabled={saving} className="h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">
                  {adminForm.id ? 'Update Admin' : 'Tambah Admin'}
                </button>
              </form>

              {admins.length === 0 ? <EmptyState label="chapter admin" /> : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {admins.map(admin => (
                    <div key={admin.id} className="grid gap-3 border-b border-gray-100 bg-white/70 p-4 last:border-b-0 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
                      <div>
                        <div className="font-bold text-gray-950">{admin.name}</div>
                        <div className="text-xs text-gray-500">{admin.email}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">{admin.chapter?.display_name || chapterById.get(admin.chapter_id || '')?.display_name || '-'}</div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {admin.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setAdminForm({ id: admin.id, chapter_id: admin.chapter_id || '', name: admin.name, email: admin.email, phone: admin.phone || '', password: '' })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => toggleActive('users', admin.id, admin.is_active)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">{admin.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
