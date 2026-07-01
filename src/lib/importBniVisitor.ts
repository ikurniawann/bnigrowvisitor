import * as XLSX from 'xlsx'

export interface ParsedVisitor {
  name: string
  gender: string | null
  company: string | null
  business_field: string | null
  phone: string | null
  email: string | null
  referral_name: string | null
  meeting_format: 'Online' | 'Offline' | null
  visit_date: string | null
  source_type: string // original Type column value
}

export interface ImportParseResult {
  visitors: ParsedVisitor[]   // Type = Visitor only
  guests: ParsedVisitor[]     // Type = Guest only
  skipped: number             // Substitute/unknown count
  total: number               // total rows in file
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, '')
  if (!digits || digits.length < 8) return null
  if (digits.startsWith('62')) return '0' + digits.slice(2)
  if (digits.startsWith('0')) return digits
  return '0' + digits
}

function genderFromTitle(title: string): string | null {
  const t = title.toLowerCase().replace(/\./g, '').trim()
  if (t === 'mr') return 'Bapak'
  if (['mrs', 'ms', 'miss', 'ny', 'dr (f)', 'dr. (f)'].includes(t)) return 'Ibu'
  return null
}

function excelSerialToIso(serial: unknown): string | null {
  if (typeof serial !== 'number' || serial < 1) return null
  // Excel epoch: Jan 0 1900 = Dec 30, 1899. Unix offset = 25569 days.
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  return new Date(ms).toISOString().split('T')[0]
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildHeaderIndex(headerRow: (string | number)[]) {
  const byName = new Map<string, number>()
  headerRow.forEach((cell, index) => {
    const normalized = normalizeHeader(cell)
    if (normalized && !byName.has(normalized)) byName.set(normalized, index)
  })

  return (aliases: string[], fallbackIndex: number): number => {
    for (const alias of aliases) {
      const index = byName.get(normalizeHeader(alias))
      if (typeof index === 'number') return index
    }
    return fallbackIndex
  }
}

function classifySourceType(raw: string): 'visitor' | 'guest' | 'skip' {
  const value = raw.toLowerCase().trim()
  if (!value) return 'skip'
  if (/\bguest\b/.test(value)) return 'guest'
  if (/\bvisitor\b/.test(value)) return 'visitor'
  return 'skip'
}

export function parseBniVisitorReport(buffer: ArrayBuffer): ImportParseResult {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' })

  // Locate header row by scanning for "First Name"
  const headerIdx = rows.findIndex(row =>
    row.some(cell => String(cell).toLowerCase().trim() === 'first name')
  )
  if (headerIdx === -1) {
    throw new Error('Format file tidak dikenali. Pastikan file adalah BNI Visitor Registration Report.')
  }

  const header = rows[headerIdx] || []
  const col = buildHeaderIndex(header)
  const idx = {
    title: col(['Title', 'Salutation'], 0),
    firstName: col(['First Name', 'Firstname', 'Nama Depan'], 1),
    lastName: col(['Last Name', 'Lastname', 'Nama Belakang'], 2),
    company: col(['Company', 'Company Name', 'Business Name', 'Nama Perusahaan'], 4),
    profession: col(['Profession', 'Business Category', 'Business Field', 'Industry', 'Bidang Usaha'], 6),
    invitedBy: col(['Invited By', 'Invited by Member', 'Referred By', 'Referral Name', 'Diajak Oleh'], 9),
    visitDate: col(['Visit Date', 'Meeting Date', 'Tanggal Visit', 'Tanggal Meeting'], 11),
    format: col(['Format', 'Meeting Format', 'Visit Format', 'Online Offline', 'Online/Offline'], 12),
    phone: col(['Phone', 'Phone Number', 'No WA', 'Whatsapp', 'WhatsApp', 'No WhatsApp'], 13),
    mobile: col(['Mobile', 'Mobile Number', 'Handphone', 'HP', 'No HP'], 15),
    email: col(['Email', 'Email Address'], 18),
    sourceType: col(['Type', 'Visitor Type', 'Registration Type', 'Attendee Type', 'Attendance Type', 'Participant Type'], 26),
  }

  const dataRows = rows.slice(headerIdx + 1).filter(row =>
    row.some(cell => String(cell).trim() !== '')
  )

  const visitors: ParsedVisitor[] = []
  const guests: ParsedVisitor[] = []
  let skipped = 0

  for (const row of dataRows) {
    const title       = String(row[idx.title]  ?? '').trim()
    const firstName   = String(row[idx.firstName]  ?? '').trim()
    const lastName    = String(row[idx.lastName]  ?? '').trim()
    const company     = String(row[idx.company]  ?? '').trim() || null
    const profession  = String(row[idx.profession]  ?? '').trim()
    const phoneCol    = String(row[idx.phone] ?? '').trim()
    const mobileCol   = String(row[idx.mobile] ?? '').trim()
    const email       = String(row[idx.email] ?? '').trim() || null
    const invitedBy   = String(row[idx.invitedBy]  ?? '').trim() || null
    const visitDate   = row[idx.visitDate]
    const format      = String(row[idx.format] ?? '').trim()
    const sourceType  = String(row[idx.sourceType] ?? '').trim()

    const name = [firstName, lastName].filter(Boolean).join(' ')
    if (!name) continue

    const normalizedType = classifySourceType(sourceType)
    if (normalizedType === 'skip') {
      skipped++
      continue
    }

    const phone = normalizePhone(phoneCol) || normalizePhone(mobileCol)

    const parsedRow: ParsedVisitor = {
      name,
      gender: genderFromTitle(title),
      company,
      business_field: profession || null,
      phone,
      email,
      referral_name: invitedBy,
      meeting_format: format === 'Online' || format === 'Offline' ? (format as 'Online' | 'Offline') : null,
      visit_date: excelSerialToIso(visitDate),
      source_type: sourceType,
    }

    if (normalizedType === 'guest') guests.push(parsedRow)
    else visitors.push(parsedRow)
  }

  return { visitors, guests, skipped, total: dataRows.length }
}
