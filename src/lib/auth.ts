import { User } from './supabase'
import { logActivity } from './activityLog'

// All credential checks happen server-side (/api/auth/*) so the browser never
// sees password hashes and the session lives in an httpOnly signed cookie.

const AUTH_TIMEOUT_MS = 12000

async function authRequest(path: string, body?: Record<string, unknown>) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  try {
    const response = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)
    return { ok: response.ok, data }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Koneksi terlalu lama. Coba refresh halaman atau cek koneksi internet.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { ok, data } = await authRequest('/api/auth/login', { email, password })

    if (!ok || !data?.user) {
      return { success: false, error: data?.error || 'Email atau password salah.' }
    }

    return { success: true, user: data.user as User }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message || 'Login gagal' }
  }
}

export async function changePassword(email: string, oldPassword: string, newPassword: string) {
  try {
    const { ok, data } = await authRequest('/api/auth/change-password', {
      email,
      oldPassword,
      newPassword,
    })

    if (!ok) {
      return { success: false, error: data?.error || 'Gagal mengubah password.' }
    }

    await logActivity({
      action: 'update',
      entity: 'user_password',
      entityLabel: email.trim().toLowerCase(),
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
    const { ok, data } = await authRequest('/api/auth/change-password', { email, oldPassword })

    if (!ok) {
      return { success: false, error: data?.error || 'Password lama salah.' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Verify old password error:', error)
    return { success: false, error: error.message || 'Gagal validasi password lama.' }
  }
}

export async function signOut() {
  try {
    await authRequest('/api/auth/logout', {})
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    localStorage.removeItem('user')
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { ok, data } = await authRequest('/api/auth/me')
    if (!ok || !data?.user) return null
    return data.user as User
  } catch {
    return null
  }
}
