import * as XLSX from 'xlsx'

// Parser for the BNI "Chapter Membership Dues Report" Excel export. Deterministic
// (no AI): the report has a fixed set of labelled columns, so we locate the
// header row by its labels and read known fields by column index. Header
// matching is alias-based and case-insensitive, so minor layout/label shifts
// (or an Indonesian-localised export) still parse.

export interface ParsedMember {
  name: string
  business_field: string | null
  status: string
  renewal_date: string | null
  role: string | null // original "Type" column (President, Member, committee role…)
}

export interface MemberImportResult {
  members: ParsedMember[]
  total: number // data rows seen (excluding header/metadata)
}

// Header label aliases → logical field. Lowercased, trimmed before compare.
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['member name', 'name', 'nama', 'nama member'],
  business_field: ['industry', 'business field', 'bidang usaha', 'bidang', 'klasifikasi bisnis'],
  type: ['type', 'peran', 'role', 'jabatan'],
  status: ['membership status', 'status', 'status keanggotaan'],
  due: ['due date', 'renewal date', 'tanggal renewal', 'jatuh tempo', 'tgl jatuh tempo'],
}

function excelSerialToIso(serial: unknown): string | null {
  if (typeof serial === 'number' && serial > 1) {
    // Excel epoch: Dec 30, 1899. Unix offset = 25569 days.
    const ms = Math.round((serial - 25569) * 86400 * 1000)
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  // Tolerate already-formatted date strings.
  if (typeof serial === 'string') {
    const t = Date.parse(serial)
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10)
  }
  return null
}

function cell(row: (string | number | null)[], idx: number): string {
  if (idx < 0) return ''
  return String(row[idx] ?? '').trim()
}

export function parseBniMembersReport(buffer: ArrayBuffer): MemberImportResult {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null })

  // Find the header row: the first row that carries a recognisable name column.
  let headerIdx = -1
  const col: Record<string, number> = { name: -1, business_field: -1, type: -1, status: -1, due: -1 }
  for (let i = 0; i < rows.length; i++) {
    const lowered = rows[i].map(c => String(c ?? '').toLowerCase().trim())
    const nameCol = lowered.findIndex(c => HEADER_ALIASES.name.includes(c))
    if (nameCol === -1) continue
    headerIdx = i
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      col[field] = lowered.findIndex(c => aliases.includes(c))
    }
    break
  }

  if (headerIdx === -1 || col.name === -1) {
    throw new Error('Format file tidak dikenali. Pastikan ini BNI Chapter Membership Dues Report (ada kolom "Member Name").')
  }

  const dataRows = rows.slice(headerIdx + 1).filter(r => Array.isArray(r) && cell(r, col.name) !== '')
  const members: ParsedMember[] = []

  for (const row of dataRows) {
    const name = cell(row, col.name)
    if (!name) continue
    const statusRaw = cell(row, col.status).toLowerCase()
    members.push({
      name,
      business_field: cell(row, col.business_field) || null,
      status: statusRaw || 'active',
      renewal_date: col.due >= 0 ? excelSerialToIso(row[col.due]) : null,
      role: cell(row, col.type) || null,
    })
  }

  return { members, total: dataRows.length }
}
