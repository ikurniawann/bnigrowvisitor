'use client'

import { useMemo, useState } from 'react'
import { Guest, useData } from '@/hooks/useData'

const itemsPerPage = 12

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function Guests() {
  const { guests, loading, deleteGuest } = useData()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return guests

    return guests.filter(guest => [
      guest.name,
      guest.phone,
      guest.email,
      guest.business_field,
      guest.company,
      guest.referral_name,
      guest.meeting_title,
      guest.source_type,
    ].some(value => String(value || '').toLowerCase().includes(query)))
  }, [guests, search])

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedGuests = filteredGuests.slice(startIndex, startIndex + itemsPerPage)
  const withPhone = guests.filter(guest => guest.phone).length
  const withEmail = guests.filter(guest => guest.email).length

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  async function handleDelete(guest: Guest) {
    if (!confirm(`Hapus guest ${guest.name}?`)) return
    await deleteGuest(guest.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Guest</h1>
          <p className="mt-1 text-sm text-gray-500">Data guest hasil import BNI Report, terpisah dari pipeline visitor.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm font-semibold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
            placeholder="Cari nama, WA, email, perusahaan..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Guest" value={guests.length} tone="text-red-600" />
        <SummaryCard label="Ada No. WA" value={withPhone} tone="text-emerald-600" />
        <SummaryCard label="Ada Email" value={withEmail} tone="text-blue-600" />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Data Guest</h2>
            <p className="mt-1 text-xs text-gray-500">
              Menampilkan {filteredGuests.length} dari {guests.length} guest
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading guest...</div>
        ) : filteredGuests.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {search ? 'Tidak ada guest sesuai pencarian.' : 'Belum ada data guest.'}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                    <th className="px-5 py-3">Nama</th>
                    <th className="px-5 py-3">Kontak</th>
                    <th className="px-5 py-3">Bisnis</th>
                    <th className="px-5 py-3">Perusahaan</th>
                    <th className="px-5 py-3">Diajak Oleh</th>
                    <th className="px-5 py-3">Meeting</th>
                    <th className="px-5 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGuests.map(guest => (
                    <tr key={guest.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-950">{guest.name}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{guest.gender || '-'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div>{guest.phone || '-'}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{guest.email || '-'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-700">{guest.business_field || '-'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{guest.company || '-'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{guest.referral_name || '-'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        <div>{guest.meeting_title || '-'}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{formatDate(guest.meeting_date)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDelete(guest)}
                          className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {paginatedGuests.map(guest => (
                <div key={guest.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gray-950">{guest.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{guest.business_field || 'Bidang usaha belum diisi'}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700">
                      Guest
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600">
                    <InfoBox label="Kontak" value={guest.phone || '-'} detail={guest.email || '-'} />
                    <InfoBox label="Perusahaan" value={guest.company || '-'} detail={guest.referral_name ? `Diajak oleh ${guest.referral_name}` : undefined} />
                    <InfoBox label="Meeting" value={guest.meeting_title || '-'} detail={formatDate(guest.meeting_date)} />
                  </div>
                  <button
                    onClick={() => handleDelete(guest)}
                    className="mt-3 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-gray-500">
                Menampilkan <span className="font-bold text-gray-900">{startIndex + 1}</span> - <span className="font-bold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredGuests.length)}</span> dari <span className="font-bold text-gray-900">{filteredGuests.length}</span> guest
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="min-w-16 rounded-xl bg-gray-50 px-3 py-2 text-center text-xs font-bold text-gray-600">
                  {page}/{totalPages}
                </span>
                <button
                  onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-gray-500">{label}</div>
    </div>
  )
}

function InfoBox({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-0.5 break-words">{value}</div>
      {detail && <div className="mt-0.5 break-words text-xs text-gray-500">{detail}</div>}
    </div>
  )
}
