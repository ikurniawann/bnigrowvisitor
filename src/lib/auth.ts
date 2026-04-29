import { supabase, User } from './supabase'

export async function signIn(email: string, password: string) {
  try {
    // For development: directly check users table
    console.log('Attempting login with email:', email)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
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

    console.log('User found:', user.email, 'Role:', user.role)

    // Simple password check for development
    // In production, use bcrypt comparison with password_hash
    if (password !== 'admin123') {
      console.log('Wrong password for user:', email)
      return { success: false, error: 'Password salah' }
    }

    console.log('Login successful for:', email)
    return { success: true, user: user as User }
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
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data as User
  } catch {
    return null
  }
}
