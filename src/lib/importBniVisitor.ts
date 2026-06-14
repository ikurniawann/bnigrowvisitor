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
  skipped: number             // Guest + Substitute count
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

  const dataRows = rows.slice(headerIdx + 1).filter(row =>
    row.some(cell => String(cell).trim() !== '')
  )

  let skipped = 0
  const visitors: ParsedVisitor[] = []

  for (const row of dataRows) {
    const title       = String(row[0]  ?? '').trim()
    const firstName   = String(row[1]  ?? '').trim()
    const lastName    = String(row[2]  ?? '').trim()
    const company     = String(row[4]  ?? '').trim() || null
    const profession  = String(row[6]  ?? '').trim()
    const phoneCol    = String(row[13] ?? '').trim()
    const mobileCol   = String(row[15] ?? '').trim()
    const email       = String(row[18] ?? '').trim() || null
    const invitedBy   = String(row[9]  ?? '').trim() || null
    const visitDate   = row[11]
    const format      = String(row[12] ?? '').trim()
    const sourceType  = String(row[26] ?? '').trim()

    const name = [firstName, lastName].filter(Boolean).join(' ')
    if (!name) continue

    if (sourceType.toLowerCase() !== 'visitor') {
      skipped++
      continue
    }

    const phone = normalizePhone(phoneCol) || normalizePhone(mobileCol)

    visitors.push({
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
    })
  }

  return { visitors, skipped, total: dataRows.length }
}
