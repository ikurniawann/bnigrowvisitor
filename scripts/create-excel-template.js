// Script to create Excel template for visitor import
// Run with: node scripts/create-excel-template.js

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const sampleData = [
  {
    Nama: 'Budi Santoso',
    'No WhatsApp': '081234567890',
    Email: 'budi@example.com',
    'Bidang Usaha': 'Digital Marketing',
    Perusahaan: 'PT Kreatif Digital',
    Chapter: 'BNI Grow Jakarta Selatan',
    'Diajak oleh': 'Andi Wijaya',
  },
  {
    Nama: 'Siti Rahayu',
    'No WhatsApp': '082345678901',
    Email: 'siti@example.com',
    'Bidang Usaha': 'Kuliner & Catering',
    Perusahaan: 'Dapur Siti',
    Chapter: 'BNI Grow Jakarta Pusat',
    'Diajak oleh': '',
  },
];

const columns = [
  { header: 'Nama', key: 'Nama', width: 25 },
  { header: 'No WhatsApp', key: 'No WhatsApp', width: 15 },
  { header: 'Email', key: 'Email', width: 30 },
  { header: 'Bidang Usaha', key: 'Bidang Usaha', width: 25 },
  { header: 'Perusahaan', key: 'Perusahaan', width: 25 },
  { header: 'Chapter', key: 'Chapter', width: 25 },
  { header: 'Diajak oleh', key: 'Diajak oleh', width: 20 },
];

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
  ['   - 081234567890'],
  ['   - 6281234567890'],
  ['   - Hindari nomor tanpa 0 di depan'],
  ['   - Hindari spasi, plus, dan strip'],
];

async function main() {
  const workbook = new ExcelJS.Workbook();

  const visitorSheet = workbook.addWorksheet('Visitor Template');
  visitorSheet.columns = columns;
  visitorSheet.addRows(sampleData);
  visitorSheet.getRow(1).font = { bold: true };

  const instructionsSheet = workbook.addWorksheet('Instruksi');
  instructionsSheet.columns = [{ width: 60 }];
  instructions.forEach(row => instructionsSheet.addRow(row));
  instructionsSheet.getRow(1).font = { bold: true };

  const outputPath = path.join(__dirname, '..', 'public', 'templates', 'visitor-import-template.xlsx');
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await workbook.xlsx.writeFile(outputPath);

  console.log('Excel template created successfully!');
  console.log(`  Location: ${outputPath}`);
}

main().catch(error => {
  console.error('Failed to create Excel template:', error);
  process.exit(1);
});
