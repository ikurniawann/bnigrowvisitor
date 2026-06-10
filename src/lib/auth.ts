import { supabase, User } from './supabase'

export async function signIn(email: string, password: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, avatar_url, is_active, created_at, updated_at, password_hash')
      .eq('email', email)
      .eq('is_active', true)
      .single()

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
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, avatar_url, is_active, created_at, updated_at')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data as User
  } catch {
    return null
  }
}
