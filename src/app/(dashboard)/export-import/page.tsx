'use client'

import { useState } from 'react'
import { useData } from '@/hooks/useData'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export default function ExportImport() {
  const { visitors, members } = useData()
  const [isExporting, setIsExporting] = useState(false)

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
      saveAs(blob, `BNI_Grow_Visitors_${new Date().toISOString().split('T')[0]}.xlsx`)
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
      saveAs(blob, `BNI_Grow_Members_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Gagal export data members')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Export / Import Data</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola export dan import data BNI Grow</p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Import Section (Placeholder) */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Import Data
        </h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Import dari Excel</h3>
          <p className="text-xs text-gray-500 mb-4">
            Fitur import akan segera tersedia. Upload file Excel untuk import data visitor atau member secara bulk.
          </p>
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  )
}
