import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export interface VisitorData {
  no: number
  name: string
  gender: string
  business_field?: string
  company?: string
  phone?: string
  email?: string
  referred_by?: string
  status: string
  meeting_date?: string
}

export const handleExportExcel = async (visitors: any[], startIndex: number) => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Visitor List')
  
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
    { key: 'meeting_date', width: 15 }
  ]
  
  // Header style
  const headerRow = worksheet.addRow([
    'NO', 'NAMA', 'GENDER', 'BIDANG USAHA', 'PERUSAHAAN', 
    'NO WA', 'EMAIL', 'DIAJAK OLEH', 'STATUS', 'TANGGAL MEETING'
  ])
  
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC143C' } // BNI Red
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  
  // Add data rows
  visitors.forEach((visitor, index) => {
    worksheet.addRow({
      no: startIndex + index + 1,
      name: visitor.name,
      gender: visitor.gender || '-',
      business_field: visitor.business_field || '-',
      company: visitor.company || '-',
      phone: visitor.phone || '-',
      email: visitor.email || '-',
      referred_by: visitor.referred_by_member_name || '-',
      status: visitor.status || '-',
      meeting_date: visitor.meeting_date ? new Date(visitor.meeting_date).toLocaleDateString('id-ID') : '-'
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
}
