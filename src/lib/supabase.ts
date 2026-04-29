import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for server-side operations (bypasses RLS)
// For development only - in production, use proper RLS policies
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey)

export type UserRole = 'admin' | 'pic' | 'member'

export type VisitorStatus = 
  | 'new'
  | 'followup'
  | 'confirmed'
  | 'attended'
  | 'no_show'
  | 'interview'
  | 'member'
  | 'not_continue'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Visitor {
  id: string
  name: string
  phone: string
  email?: string
  business_field?: string
  company?: string
  chapter?: string
  gender?: string
  referral_name?: string
  referral_user_id?: string
  meeting_id?: string
  meeting_date?: string
  pic_id?: string
  status: VisitorStatus
  attended_choice?: string  // Choice 1, 2, or 3 when status is 'attended'
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  title: string
  meeting_date: string
  location?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}
