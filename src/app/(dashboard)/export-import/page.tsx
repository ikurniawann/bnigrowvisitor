'use client'

import { useEffect, useRef, useState } from 'react'
import { useData } from '@/hooks/useData'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { getChapterBranding } from '@/lib/chapterBranding'
import { parseBniVisitorReport, ParsedVisitor } from '@/lib/importBniVisitor'

// Slug for filenames, e.g. "BNI Grow Chapter" → "BNI_Grow_Chapter".
function brandFileSlug(): string {
  const { displayName } = getChapterBranding()
  return (displayName || 'BNI').replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '') || 'BNI'
}

interface ImportResult {
  imported: number
  updated: number
  skipped: number
  total: number
  guests?: {
    imported: number
    updated: number
    skipped: number
  }
}

type ImportStep = 'idle' | 'preview' | 'importing' | 'done'

export default function ExportImport() {
  const { visitors, guests, members, meetings, reload } = useData()
  const [isExporting, setIsExporting] = useState(false)
  const [brandLabel, setBrandLabel] = useState('data chapter')

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [importStep, setImportStep] = useState<ImportStep>('idle')
  const [parsedVisitors, setParsedVisitors] = useState<ParsedVisitor[]>([])
  const [parsedGuests, setParsedGuests] = useState<ParsedVisitor[]>([])
  const [skippedCount, setSkippedCount] = useState(0)
  const [parseError, setParseError] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) ?? null

  useEffect(() => {
    setBrandLabel(getChapterBranding().displayName)
  }, [])

  function handleFileSelect(file: File) {
    if (!file || !selectedMeetingId) return
    setParseError('')
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const result = parseBniVisitorReport(buffer)
        setParsedVisitors(result.visitors)
        setParsedGuests(result.guests)
        setSkippedCount(result.skipped)
        setImportStep('preview')
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : 'Gagal membaca file.')
        setImportStep('idle')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function handleImport() {
    if (parsedVisitors.length + parsedGuests.length === 0 || !selectedMeetingId) return
    setImportStep('importing')
    try {
      const res = await fetch('/api/data/visitors/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitors: parsedVisitors, guests: parsedGuests, meetingId: selectedMeetingId, updateExisting }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal import.')
      setImportResult(json.data)
      await reload()
      setImportStep('done')
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Gagal import.')
      setImportStep('preview')
    }
  }

  function resetImport() {
    setImportStep('idle')
    setParsedVisitors([])
    setParsedGuests([])
    setSkippedCount(0)
    setParseError('')
    setImportResult(null)
    setUpdateExisting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Export Visitors to Excel
  const handleExportVisitors = async () => {
    setIsExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Visitors')
      
      // Set column widths
      worksheet.columns = [
        { key: 'no', width: 5 },
        { key: 'name', width: 25 },
        { key: 'gender', width: 10 },
        { key: 'business_field', width: 30 },
        { key: 'company', width: 25 },
        { key: 'phone', width: 15 },
        { key: 'email', width: 30 },
        { key: 'referred_by', width: 20 },
        { key: 'status', width: 15 },
        { key: 'meeting_date', width: 15 },
        { key: 'created_at', width: 20 }
      ]
      
      // Header style
      const headerRow = worksheet.addRow([
        'NO', 'NAMA', 'GENDER', 'BIDANG USAHA', 'PERUSAHAAN', 
        'NO WA', 'EMAIL', 'DIAJAK OLEH', 'STATUS', 'TANGGAL MEETING', 'TANGGAL INPUT'
      ])
      
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC143C' } // BNI Red
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      
      // Add data rows
      visitors.forEach((visitor: any, index: number) => {
        worksheet.addRow({
          no: index + 1,
          name: visitor.name,
          gender: visitor.gender || '-',
          business_field: visitor.business_field || '-',
          company: visitor.company || '-',
          phone: visitor.phone || '-',
          email: visitor.email || '-',
          referred_by: visitor.referred_by_member_name || '-',
          status: visitor.status || '-',
          meeting_date: visitor.meeting_date ? new Date(visitor.meeting_date).toLocaleDateString('id-ID') : '-',
          created_at: new Date(visitor.created_at).toLocaleDateString('id-ID')
        })
      })
      
      // Style data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' }
          row.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
        }
      })
      
      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `${brandFileSlug()}_Visitors_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Gagal export data visitors')
    } finally {
      setIsExporting(false)
    }
  }

  // Export Members to Excel
  const handleExportMembers = async () => {
    setIsExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Members')
      
      worksheet.columns = [
        { key: 'no', width: 5 },
        { key: 'name', width: 25 },
        { key: 'phone', width: 15 },
        { key: 'email', width: 30 },
        { key: 'business_field', width: 25 },
        { key: 'company', width: 25 },
        { key: 'chapter', width: 20 },
        { key: 'joined_date', width: 15 },
        { key: 'status', width: 15 }
      ]
      
      const headerRow = worksheet.addRow([
        'NO', 'NAMA', 'NO WA', 'EMAIL', 'BIDANG USAHA', 'PERUSAHAAN', 'CHAPTER', 'TANGGAL GABUNG', 'STATUS'
      ])
      
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC143C' }
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      
      members.forEach((member: any, index: number) => {
        worksheet.addRow({
          no: index + 1,
          name: member.name,
          phone: member.phone || '-',
          email: member.email || '-',
          business_field: member.business_field || '-',
          company: member.company || '-',
          chapter: member.chapter || '-',
          joined_date: member.joined_date ? new Date(member.joined_date).toLocaleDateString('id-ID') : '-',
          status: member.status || '-'
        })
      })
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' }
          row.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
        }
      })
      
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `${brandFileSlug()}_Members_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Gagal export data members')
    } finally {
      setIsExporting(false)
    }
  }

  // Export Guests to Excel
  const handleExportGuests = async () => {
    setIsExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Guests')

      worksheet.columns = [
        { key: 'no', width: 5 },
        { key: 'name', width: 25 },
        { key: 'gender', width: 10 },
        { key: 'business_field', width: 30 },
        { key: 'company', width: 25 },
        { key: 'phone', width: 15 },
        { key: 'email', width: 30 },
        { key: 'referred_by', width: 20 },
        { key: 'meeting_date', width: 15 },
        { key: 'meeting_format', width: 14 },
        { key: 'created_at', width: 20 }
      ]

      const headerRow = worksheet.addRow([
        'NO', 'NAMA', 'GENDER', 'BIDANG USAHA', 'PERUSAHAAN',
        'NO WA', 'EMAIL', 'DIAJAK OLEH', 'TANGGAL MEETING', 'FORMAT', 'TANGGAL INPUT'
      ])

      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC143C' }
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

      guests.forEach((guest: any, index: number) => {
        worksheet.addRow({
          no: index + 1,
          name: guest.name,
          gender: guest.gender || '-',
          business_field: guest.business_field || '-',
          company: guest.company || '-',
          phone: guest.phone || '-',
          email: guest.email || '-',
          referred_by: guest.referral_name || '-',
          meeting_date: guest.meeting_date ? new Date(guest.meeting_date).toLocaleDateString('id-ID') : '-',
          meeting_format: guest.meeting_format || '-',
          created_at: new Date(guest.created_at).toLocaleDateString('id-ID')
        })
      })

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' }
          row.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }
        }
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `${brandFileSlug()}_Guests_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Gagal export data guests')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Export / Import Data</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola export dan import {brandLabel}</p>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Data
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Export Visitors */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Visitor List</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {visitors.length} visitors
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mb-4">
              Export semua data visitor termasuk: Nama, Gender, Bidang Usaha, Perusahaan, No WA, Email, Status, dll.
            </p>
            
            <button
              onClick={handleExportVisitors}
              disabled={isExporting || visitors.length === 0}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-medium rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export Excel
                </>
              )}
            </button>
          </div>

          {/* Export Guests */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Guest List</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {guests.length} guests
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 18a7 7 0 0 1 14 0M19 8h3M20.5 6.5v3"/>
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mb-4">
              Export data guest terpisah dari visitor, termasuk meeting asal, format meeting, dan kontak.
            </p>
            
            <button
              onClick={handleExportGuests}
              disabled={isExporting || guests.length === 0}
              className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export Excel
                </>
              )}
            </button>
          </div>

          {/* Export Members */}
          <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Member List</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {members.length} members
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mb-4">
              Export semua data member termasuk: Nama, No WA, Email, Bidang Usaha, Perusahaan, Chapter, Status, dll.
            </p>
            
            <button
              onClick={handleExportMembers}
              disabled={isExporting || members.length === 0}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import Visitor dari BNI Report
        </h2>
        <p className="text-xs text-gray-500 mb-5">Upload file <strong>BNI Visitor Registration Report</strong> (.xls / .xlsx). Baris bertipe Visitor masuk ke table Visitor, baris bertipe Guest masuk ke table Guest, dan Substitute dilewati. Semua data akan dikaitkan ke Weekly Meeting yang dipilih.</p>

        {parseError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">{parseError}</div>
        )}

        {/* Step: idle — meeting selector then drag/drop zone */}
        {importStep === 'idle' && (
          <div className="space-y-4">
            {/* Step 1: pick meeting */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold mr-1.5">1</span>
                Pilih Weekly Meeting
              </label>
              <select
                value={selectedMeetingId}
                onChange={e => setSelectedMeetingId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">— Pilih weekly meeting terlebih dahulu —</option>
                {[...meetings].sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)).map(m => (
                  <option key={m.id} value={m.id}>
                    {new Date(m.meeting_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: upload file */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold mr-1.5">2</span>
                Upload File Excel
              </p>
              <div
                onDragOver={e => { if (!selectedMeetingId) return; e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => { if (selectedMeetingId) fileInputRef.current?.click() }}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                  !selectedMeetingId
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : isDragging
                      ? 'border-orange-400 bg-orange-50 cursor-pointer'
                      : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/40 cursor-pointer'
                }`}
              >
                <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {selectedMeetingId ? 'Drag & drop file di sini' : 'Pilih weekly meeting dulu'}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedMeetingId ? 'atau klik untuk pilih file .xls / .xlsx' : 'Upload file baru tersedia setelah memilih meeting'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: preview */}
        {(importStep === 'preview' || importStep === 'importing') && (
          <div>
            {/* Selected meeting banner */}
            {selectedMeeting && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
                <svg className="w-4 h-4 text-orange-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-orange-800 truncate">{selectedMeeting.title}</p>
                  <p className="text-xs text-orange-600">
                    {new Date(selectedMeeting.meeting_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="ml-auto flex-shrink-0 text-[10px] font-bold text-orange-500 bg-orange-100 rounded-full px-2 py-0.5">Tanggal meeting ini yang dipakai</span>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{parsedVisitors.length + parsedGuests.length + skippedCount}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total baris di file</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{parsedVisitors.length}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Visitor akan diimport</div>
              </div>
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{parsedGuests.length}</div>
                <div className="text-xs text-orange-600 mt-0.5">Guest akan diimport</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center col-span-2 sm:col-span-3">
                <div className="text-2xl font-bold text-gray-500">{skippedCount}</div>
                <div className="text-xs text-gray-400 mt-0.5">Substitute / tipe lain dilewati</div>
              </div>
            </div>

            {/* Preview table */}
            {parsedVisitors.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-100 mb-5 max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Nama</th>
                      <th className="text-left px-3 py-2">Gender</th>
                      <th className="text-left px-3 py-2">Perusahaan</th>
                      <th className="text-left px-3 py-2">No WA</th>
                      <th className="text-left px-3 py-2">Diajak Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedVisitors.slice(0, 50).map((v, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{v.name}</td>
                        <td className="px-3 py-2 text-gray-600">{v.gender || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{v.company || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{v.phone || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{v.referral_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedVisitors.length > 50 && (
                  <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                    Menampilkan 50 dari {parsedVisitors.length} visitor
                  </div>
                )}
              </div>
            )}

            {parsedGuests.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-orange-100 mb-5 max-h-72">
                <div className="border-b border-orange-100 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                  Preview Guest ({parsedGuests.length})
                </div>
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Nama</th>
                      <th className="text-left px-3 py-2">Gender</th>
                      <th className="text-left px-3 py-2">Perusahaan</th>
                      <th className="text-left px-3 py-2">No WA</th>
                      <th className="text-left px-3 py-2">Diajak Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedGuests.slice(0, 50).map((v, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{v.name}</td>
                        <td className="px-3 py-2 text-gray-600">{v.gender || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{v.company || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{v.phone || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{v.referral_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedGuests.length > 50 && (
                  <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                    Menampilkan 50 dari {parsedGuests.length} guest
                  </div>
                )}
              </div>
            )}

            <label className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={e => setUpdateExisting(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-600"
              />
              <span className="text-xs text-gray-700">
                <span className="font-semibold">Perbarui visitor yang sudah ada di meeting ini</span> (cocok berdasarkan No. WA / nama).
                Memperbarui perusahaan, bidang, WA, email, &amp; diajak-oleh — <span className="font-semibold">status TIDAK diubah</span>.
                Jika tidak dicentang, visitor yang sudah ada akan dilewati (tidak dobel).
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={importStep === 'importing' || parsedVisitors.length + parsedGuests.length === 0}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold rounded-xl shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importStep === 'importing' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Mengimport…
                  </>
                ) : (
                  <>Import {parsedVisitors.length} Visitor + {parsedGuests.length} Guest ke {selectedMeeting?.title || 'meeting'}</>
                )}
              </button>
              <button
                onClick={resetImport}
                disabled={importStep === 'importing'}
                className="px-4 py-2.5 border border-gray-200 bg-white text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {importStep === 'done' && importResult && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Import Berhasil!</h3>
            <div className="grid grid-cols-2 gap-4 mb-5 mt-3 sm:grid-cols-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{importResult.imported}</div>
                <div className="text-xs text-gray-500">Visitor Baru</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-xs text-gray-500">Visitor Update</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{importResult.guests?.imported || 0}</div>
                <div className="text-xs text-gray-500">Guest Baru</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{importResult.guests?.updated || 0}</div>
                <div className="text-xs text-gray-500">Guest Update</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">{importResult.skipped + (importResult.guests?.skipped || 0)}</div>
                <div className="text-xs text-gray-500">Dilewati</div>
              </div>
            </div>
            <button
              onClick={resetImport}
              className="px-5 py-2 border border-gray-200 bg-white text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
            >
              Import File Lain
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
