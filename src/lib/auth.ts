import { supabase, User } from './supabase'
import { logActivity } from './activityLog'

const AUTH_TIMEOUT_MS = 12000
const USER_SELECT = 'id, name, email, role, phone, avatar_url, is_active, created_at, updated_at, organization_id, chapter_id'
const USER_SELECT_WITH_PASSWORD = `${USER_SELECT}, password_hash`
const LEGACY_USER_SELECT = 'id, name, email, role, phone, avatar_url, is_active, created_at, updated_at'
const LEGACY_USER_SELECT_WITH_PASSWORD = `${LEGACY_USER_SELECT}, password_hash`

function withTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message))
    }, AUTH_TIMEOUT_MS)

    Promise.resolve(promise)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout))
  })
}

async function selectUserByEmail(email: string, includePassword = false) {
  const columns = includePassword ? USER_SELECT_WITH_PASSWORD : USER_SELECT
  const legacyColumns = includePassword ? LEGACY_USER_SELECT_WITH_PASSWORD : LEGACY_USER_SELECT

  let result: any = await withTimeout(
    supabase
      .from('users')
      .select(columns)
      .eq('email', email)
      .eq('is_active', true)
      .single(),
    'Koneksi terlalu lama. Coba refresh halaman atau cek koneksi internet.'
  )

  if (result.error && result.error.message?.includes('organization_id')) {
    result = await withTimeout(
      supabase
        .from('users')
        .select(legacyColumns)
        .eq('email', email)
        .eq('is_active', true)
        .single(),
      'Koneksi terlalu lama. Coba refresh halaman atau cek koneksi internet.'
    )
  }

  return result
}

async function selectUserById(id: string) {
  let result: any = await withTimeout(
    supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .single(),
    'Validasi sesi terlalu lama.'
  )

  if (result.error && result.error.message?.includes('organization_id')) {
    result = await withTimeout(
      supabase
        .from('users')
        .select(LEGACY_USER_SELECT)
        .eq('id', id)
        .eq('is_active', true)
        .single(),
      'Validasi sesi terlalu lama.'
    )
  }

  return result
}

async function enrichUserScope(user: any): Promise<User> {
  const safeUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
    chapter_id: user.chapter_id,
    phone: user.phone,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }

  if (user.organization_id) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', user.organization_id)
      .maybeSingle()

    safeUser.organization_name = organization?.name
  }

  if (user.chapter_id) {
    const { data: chapter } = await supabase
      .from('chapters')
      .select(`
        id,
        name,
        display_name,
        area:area_id (
          id,
          name,
          city:city_id (
            id,
            name
          )
        )
      `)
      .eq('id', user.chapter_id)
      .maybeSingle()

    if (chapter) {
      const area = Array.isArray(chapter.area) ? chapter.area[0] : chapter.area
      const city = area ? (Array.isArray(area.city) ? area.city[0] : area.city) : undefined

      safeUser.chapter_name = chapter.name
      safeUser.chapter_display_name = chapter.display_name
      safeUser.area_name = area?.name
      safeUser.city_name = city?.name
    }
  }

  return safeUser
}

export async function signIn(email: string, password: string) {
  try {
    const { data: user, error } = await selectUserByEmail(email, true)

    if (error) {
      console.error('Database error:', error)
      return { success: false, error: 'Email tidak terdaftar atau error database' }
    }

    if (!user) {
      console.log('No user found with email:', email)
      return { success: false, error: 'Email tidak terdaftar' }
    }

    if (typeof user.password_hash === 'string' && user.password_hash.startsWith('$2')) {
      return {
        success: false,
        error: 'Password tersimpan sebagai hash bcrypt, tetapi verifikasi bcrypt belum tersedia di client login ini.',
      }
    }

    if (password !== user.password_hash) {
      return { success: false, error: 'Password salah' }
    }

    return { success: true, user: await enrichUserScope(user) }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message || 'Login gagal' }
  }
}

export async function changePassword(email: string, oldPassword: string, newPassword: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase()

    const { data: user, error } = await selectUserByEmail(normalizedEmail, true)

    if (error || !user) {
      return { success: false, error: 'Email tidak terdaftar atau akun tidak aktif.' }
    }

    if (typeof user.password_hash === 'string' && user.password_hash.startsWith('$2')) {
      return {
        success: false,
        error: 'Password lama belum bisa divalidasi karena masih tersimpan sebagai hash bcrypt.',
      }
    }

    if (oldPassword !== user.password_hash) {
      return { success: false, error: 'Password lama salah.' }
    }

    if (newPassword === oldPassword) {
      return { success: false, error: 'Password baru harus berbeda dari password lama.' }
    }

    const { error: updateError } = await withTimeout(
      supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', user.id),
      'Update password terlalu lama. Coba lagi.'
    )

    if (updateError) {
      return { success: false, error: updateError.message || 'Gagal mengubah password.' }
    }

    await logActivity({
      action: 'update',
      entity: 'user_password',
      entityId: user.id,
      entityLabel: normalizedEmail,
      metadata: { changed_from_login_page: true },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Change password error:', error)
    return { success: false, error: error.message || 'Gagal mengubah password.' }
  }
}

export async function verifyOldPassword(email: string, oldPassword: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase()

    const { data: user, error } = await selectUserByEmail(normalizedEmail, true)

    if (error || !user) {
      return { success: false, error: 'Email tidak terdaftar atau akun tidak aktif.' }
    }

    if (typeof user.password_hash === 'string' && user.password_hash.startsWith('$2')) {
      return {
        success: false,
        error: 'Password lama belum bisa divalidasi karena masih tersimpan sebagai hash bcrypt.',
      }
    }

    if (oldPassword !== user.password_hash) {
      return { success: false, error: 'Password lama salah.' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Verify old password error:', error)
    return { success: false, error: error.message || 'Gagal validasi password lama.' }
  }
}

export async function signOut() {
  // Clear localStorage only (no Supabase Auth session)
  localStorage.removeItem('user')
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) return null
    
    const user = JSON.parse(storedUser)
    
    // Verify user still exists and is active
    const { data, error } = await selectUserById(user.id)

    if (error || !data) return null
    return await enrichUserScope(data)
  } catch {
    return null
  }
}
