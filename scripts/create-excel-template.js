// Script to create Excel template for visitor import
// Run with: node scripts/create-excel-template.js

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Create sample data
const sampleData = [
  {
    'Nama': 'Budi Santoso',
    'No WhatsApp': '081234567890',
    'Email': 'budi@example.com',
    'Bidang Usaha': 'Digital Marketing',
    'Perusahaan': 'PT Kreatif Digital',
    'Chapter': 'BNI Grow Jakarta Selatan',
    'Diajak oleh': 'Andi Wijaya'
  },
  {
    'Nama': 'Siti Rahayu',
    'No WhatsApp': '082345678901',
    'Email': 'siti@example.com',
    'Bidang Usaha': 'Kuliner & Catering',
    'Perusahaan': 'Dapur Siti',
    'Chapter': 'BNI Grow Jakarta Pusat',
    'Diajak oleh': ''
  }
];

// Create worksheet
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
worksheet['!cols'] = [
  { wch: 25 }, // Nama
  { wch: 15 }, // No WhatsApp
  { wch: 30 }, // Email
  { wch: 25 }, // Bidang Usaha
  { wch: 25 }, // Perusahaan
  { wch: 25 }, // Chapter
  { wch: 20 }  // Diajak oleh
];

// Add header row with styling info (note: basic xlsx doesn't support styling)
// Users will see plain headers

// Create workbook
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitor Template');

// Add instructions sheet
const instructions = [
  ['INSTRUKSI IMPORT VISITOR'],
  [''],
  ['1. Kolom WAJIB diisi:'],
  ['   - Nama (nama lengkap visitor)'],
  ['   - No WhatsApp (format: 08xxx atau 62xxx)'],
  [''],
  ['2. Kolom OPSIONAL:'],
  ['   - Email'],
  ['   - Bidang Usaha'],
  ['   - Perusahaan'],
  ['   - Chapter'],
  ['   - Diajak oleh (nama member yang mengajak)'],
  [''],
  ['3. Jangan ubah nama kolom/header'],
  ['4. Hapus baris contoh sebelum upload'],
  ['5. Simpan file sebagai .xlsx atau .csv'],
  [''],
  ['Contoh format No WhatsApp yang benar:'],
  ['   ✓ 081234567890'],
  ['   ✓ 6281234567890'],
  ['   ✗ 81234567890 (kurang 0 di depan)'],
  ['   ✗ +62 812-3456-7890 (ada spasi dan strip)'],
];

const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
instructionsSheet['!cols'] = [{ wch: 60 }];
XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instruksi');

// Save file
const outputPath = path.join(__dirname, '..', 'public', 'templates', 'visitor-import-template.xlsx');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

XLSX.writeFile(workbook, outputPath);

console.log('✓ Excel template created successfully!');
console.log(`  Location: ${outputPath}`);
