import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'admin' | 'national_admin' | 'chapter_admin' | 'pic' | 'member'

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
  organization_id?: string
  chapter_id?: string
  organization_name?: string
  chapter_name?: string
  chapter_display_name?: string
  area_name?: string
  city_name?: string
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Visitor {
  id: string
  chapter_id?: string
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
  attended_choice_number?: number  // Airtime result: 1 join, 2 revisit, 3 not interested
  attended_choice_note?: string     // Airtime result label
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  chapter_id?: string
  title: string
  meeting_date: string
  location?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}
