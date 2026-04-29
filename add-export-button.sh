#!/bin/bash
# Script to add Export button to Visitors.tsx safely

FILE="/Users/ilham/Desktop/bni-grow-visitor/src/components/pages/Visitors.tsx"

# 1. Add imports after 'use client'
sed -i '' "/^'use client'/a\\
import * as ExcelJS from 'exceljs'\\
import { saveAs } from 'file-saver'" "$FILE"

echo "✅ Imports added"

# 2. Add export function before the component return
# (This is complex, better to do manually)

echo "⚠️  Manual step needed: Add handleExportExcel function and button"
echo ""
echo "Please add this function inside the Visitors component (before 'return ('):"
echo ""
cat << 'EOF'
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Visitor List')
    
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
    
    const headerRow = worksheet.addRow([
      'NO', 'NAMA', 'GENDER', 'BIDANG USAHA', 'PERUSAHAAN', 
      'NO WA', 'EMAIL', 'DIAJAK OLEH', 'STATUS', 'TANGGAL MEETING'
    ])
    
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC143C' } }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    sortedVisitors.forEach((visitor: any, index: number) => {
      worksheet.addRow({
        no: startIndex + index + 1,
        name: visitor.name,
        gender: visitor.gender || '-',
        business_field: visitor.business_field || '-',
        company: visitor.company || '-',
        phone: visitor.phone || '-',
        email: visitor.email || '-',
        referred_by: (visitor as any).referred_by_member_name || '-',
        status: visitor.status || '-',
        meeting_date: visitor.meeting_date ? new Date(visitor.meeting_date).toLocaleDateString('id-ID') : '-'
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
    saveAs(blob, `BNI_Grow_Visitors_${new Date().toISOString().split('T')[0]}.xlsx`)
  }
EOF

echo ""
echo "Then add this button in the Filter Bar section (after sort controls):"
echo ""
cat << 'EOF'
<button
  onClick={handleExportExcel}
  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow flex items-center gap-2"
>
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
  Export Excel
</button>
EOF
