import 'server-only'
import bcrypt from 'bcryptjs'
import { User } from '@/lib/supabase'
import { getSupabaseAdmin } from './supabaseAdmin'

const BCRYPT_ROUNDS = 10
const USER_COLUMNS =
  'id, name, email, role, phone, avatar_url, is_active, created_at, updated_at, organization_id, chapter_id'

interface UserRow {
  id: string
  name: string
  email: string
  role: User['role']
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  organization_id?: string
  chapter_id?: string
  password_hash?: string
}

export async function findActiveUserByEmail(email: string, includePassword = false) {
  const columns = includePassword ? `${USER_COLUMNS}, password_hash` : USER_COLUMNS
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select(columns)
    .eq('email', email.trim().toLowerCase())
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data as UserRow | null
}

export async function findActiveUserById(id: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data as UserRow | null
}

export function isBcryptHash(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('$2')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

// Verifies bcrypt hashes and, transitionally, legacy plaintext values.
// Legacy matches are upgraded to bcrypt in place so plaintext disappears over time.
export async function verifyAndUpgradePassword(user: UserRow, password: string): Promise<boolean> {
  const stored = user.password_hash
  if (!stored) return false

  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored)
  }

  if (password !== stored) return false

  const upgraded = await hashPassword(password)
  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({ password_hash: upgraded })
    .eq('id', user.id)

  if (error) {
    console.error('Gagal upgrade password ke bcrypt:', error)
  }

  return true
}

export async function updatePassword(userId: string, newPassword: string) {
  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({ password_hash: await hashPassword(newPassword) })
    .eq('id', userId)

  if (error) throw error
}

export async function enrichUserScope(row: UserRow): Promise<User> {
  const admin = getSupabaseAdmin()

  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    organization_id: row.organization_id,
    chapter_id: row.chapter_id,
    phone: row.phone,
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  const [organizationResult, chapterResult] = await Promise.all([
    row.organization_id
      ? admin.from('organizations').select('name').eq('id', row.organization_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.chapter_id
      ? admin
          .from('chapters')
          .select('id, name, display_name, area:area_id (id, name, city:city_id (id, name))')
          .eq('id', row.chapter_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (organizationResult.data) {
    user.organization_name = (organizationResult.data as { name?: string }).name
  }

  const chapter: any = chapterResult.data
  if (chapter) {
    const area = Array.isArray(chapter.area) ? chapter.area[0] : chapter.area
    const city = area ? (Array.isArray(area.city) ? area.city[0] : area.city) : undefined

    user.chapter_name = chapter.name
    user.chapter_display_name = chapter.display_name
    user.area_name = area?.name
    user.city_name = city?.name
  }

  return user
}
