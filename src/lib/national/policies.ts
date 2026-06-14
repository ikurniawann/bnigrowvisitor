// Shared, framework-agnostic policy definitions for national templates/policies.
// Kept free of client/server directives so both layers can import it.

export const POLICY_TYPES = ['wa_template', 'required_fields', 'pipeline', 'visitor_frequency'] as const
export type PolicyType = (typeof POLICY_TYPES)[number]

export function isPolicyType(value: unknown): value is PolicyType {
  return typeof value === 'string' && (POLICY_TYPES as readonly string[]).includes(value)
}

// Visitor fields that can be marked mandatory by national policy.
export const REQUIRED_FIELD_OPTIONS = [
  { key: 'phone', label: 'No. WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'business_field', label: 'Bidang Usaha' },
  { key: 'company', label: 'Perusahaan' },
  { key: 'gender', label: 'Gender' },
  { key: 'referral_name', label: 'Diajak Oleh' },
] as const

export const DEFAULT_REQUIRED_FIELDS = ['phone', 'business_field']

// Default visitor pipeline stages (labels only; the status keys themselves stay
// fixed in code). National admin can relabel them per policy.
export const DEFAULT_PIPELINE = {
  new: 'Baru Daftar',
  followup: 'Follow Up',
  confirmed: 'Konfirmasi Hadir',
  attended: 'Hadir',
  no_show: 'Tidak Hadir',
  interview: 'Interview',
  member: 'Jadi Member',
  not_continue: 'Tidak Lanjut',
}

export const DEFAULT_VISITOR_FREQUENCY = { max_visits: 2, period_months: 6 }

export function defaultPolicyConfig(type: PolicyType): Record<string, unknown> {
  switch (type) {
    case 'required_fields':
      return { fields: DEFAULT_REQUIRED_FIELDS }
    case 'pipeline':
      return { labels: DEFAULT_PIPELINE }
    case 'wa_template':
      return { online: '', offline: '' }
    case 'visitor_frequency':
      return { ...DEFAULT_VISITOR_FREQUENCY }
  }
}

// Merge an override over a default: override wins per top-level key.
export function mergePolicyConfig(
  base: Record<string, unknown> | null,
  override: Record<string, unknown> | null
): Record<string, unknown> {
  return { ...(base || {}), ...(override || {}) }
}
