import { supabase, User } from './supabase'
import { logActivity } from './activityLog'

const AUTH_TIMEOUT_MS = 12000

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

export async function signIn(email: string, password: string) {
  try {
    const { data: user, error } = await withTimeout(
      supabase
        .from('users')
        .select('id, name, email, role, phone, avatar_url, is_active, created_at, updated_at, password_hash')
        .eq('email', email)
        .eq('is_active', true)
        .single(),
      'Koneksi login terlalu lama. Coba refresh halaman atau cek koneksi internet.'
    )

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

    const safeUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
    return { success: true, user: safeUser as User }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message || 'Login gagal' }
  }
}

export async function changePassword(email: string, oldPassword: string, newPassword: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase()

    const { data: user, error } = await withTimeout(
      supabase
        .from('users')
        .select('id, email, password_hash, is_active')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .single(),
      'Koneksi terlalu lama. Coba refresh halaman atau cek koneksi internet.'
    )

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

    const { data: user, error } = await withTimeout(
      supabase
        .from('users')
        .select('id, password_hash, is_active')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .single(),
      'Koneksi terlalu lama. Coba refresh halaman atau cek koneksi internet.'
    )

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
    const { data, error } = await withTimeout(
      supabase
        .from('users')
        .select('id, name, email, role, phone, avatar_url, is_active, created_at, updated_at')
        .eq('id', user.id)
        .eq('is_active', true)
        .single(),
      'Validasi sesi terlalu lama.'
    )

    if (error || !data) return null
    return data as User
  } catch {
    return null
  }
}
