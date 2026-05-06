'use client'

import { useState, useEffect } from 'react'
import { supabase, Visitor, Meeting } from '@/lib/supabase'

export interface PIC {
  id: string
  name: string
  role: string
  wa: string
  is_active?: boolean
}

export interface VisitorWithRelations extends Visitor {
  pic_name?: string
  meeting_title?: string
  meeting_date?: string
}

export interface Member {
  id: string
  name: string
  phone?: string
  email?: string
  business_field?: string
  company?: string
  chapter?: string
  joined_date: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

const STATUSES = {
  new:          { label: 'Baru Daftar',      color: '#dbeafe' },
  followup:     { label: 'Follow Up',         color: '#fef3c7' },
  confirmed:    { label: 'Konfirmasi Hadir',  color: '#dcfce7' },
  hadir:        { label: 'Hadir',             color: '#d1fae5' },
  tidak_hadir:  { label: 'Tidak Hadir',       color: '#fee2e2' },
  interview:    { label: 'Interview',         color: '#ede9fe' },
  member:       { label: 'Jadi Member',       color: '#ccfbf1' },
  tidak_lanjut: { label: 'Tidak Lanjut',      color: '#f3f4f6' },
}

const KANBAN_COLS = ['new', 'followup', 'confirmed', 'hadir', 'interview', 'member'] as const

export function useData() {
  const [visitors, setVisitors] = useState<VisitorWithRelations[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [pics, setPics] = useState<PIC[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // Load all data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    await Promise.all([loadVisitors(), loadMeetings(), loadPics(), loadMembers()])
    setLoading(false)
  }

  async function loadVisitors() {
    const { data, error } = await supabase
      .from('visitors')
      .select(`
        *,
        pic:pic_id (id, name),
        meeting:meeting_id (id, title, meeting_date),
        referred_by_member:referred_by_member_id (id, name)
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      console.error('Error loading visitors:', error)
      setVisitors([])
      return
    }

    setVisitors((data || []).map(v => ({
      ...v,
      pic_name: (v.pic as any)?.name,
      meeting_title: (v.meeting as any)?.title,
      meeting_date: (v.meeting as any)?.meeting_date,
      referred_by_member_name: (v.referred_by_member as any)?.name,
    })))
  }

  async function loadMeetings() {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false })

    if (error) {
      console.error('Error loading meetings:', error)
      return
    }

    setMeetings(data)
  }

  async function loadPics() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, phone')
      .eq('role', 'pic')
      .eq('is_active', true)

    if (error) {
      console.error('Error loading PICs:', error)
      setPics([])
      return
    }

    setPics((data || []).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role || 'PIC',
      wa: p.phone || '',
    })))
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      console.error('Error loading members:', error)
      setMembers([])
      return
    }

    setMembers(data || [])
  }

  // CRUD Members
  async function addMember(member: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async function updateMember(id: string, member: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .update(member)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async function deleteMember(id: string) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // CRUD Visitors
  async function addVisitor(visitor: Partial<Visitor>) {
    const { data, error } = await supabase
      .from('visitors')
      .insert(visitor)
      .select()
      .single()

    if (error) throw error
    
    await loadVisitors()
    return data
  }

  async function updateVisitor(id: string, updates: Partial<Visitor>) {
    // Optimistic update: update local state immediately
    setVisitors(prev => prev.map(v => 
      v.id === id ? { ...v, ...updates } : v
    ))
    
    // Then sync to database
    const { error } = await supabase
      .from('visitors')
      .update(updates)
      .eq('id', id)

    if (error) {
      // Rollback on error
      await loadVisitors()
      throw error
    }
  }

  async function deleteVisitor(id: string) {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    await loadVisitors()
  }

  // CRUD PICs
  async function addPic(pic: Omit<PIC, 'id'>) {
    // Create user with role 'pic'
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: pic.name,
        email: `pic+${Date.now()}@bnigrow.com`,
        role: 'pic',
        phone: pic.wa,
        password_hash: 'temp',
        is_active: true,
      })
      .select('id, name, role, phone')
      .single()

    if (error) throw error
    
    await loadPics()
  
  function getReferrerDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(v => {
      // Exclude visitors with status 'Tidak Hadir' (no_show)
      if (v.status === 'no_show') return
      
      const referrerName = (v as any).referred_by_member_name
      if (referrerName) {
        distribution[referrerName] = (distribution[referrerName] || 0) + 1
      }
    })
    // Convert to array and sort by count
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 referrers
  }

  return { ...data, id: data.id, wa: data.phone }
  }

  async function updatePic(id: string, updates: Partial<PIC>) {
    const { error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        role: updates.role,
        phone: updates.wa,
      })
      .eq('id', id)

    if (error) throw error
    
    await loadPics()
  }

  async function deletePic(id: string) {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
    
    await loadPics()
  }

  // CRUD Meetings
  async function addMeeting(meeting: Partial<Meeting>) {
    const { data, error } = await supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single()

    if (error) throw error
    
    await loadMeetings()
    return data
  }

  async function deleteMeeting(id: string) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    await loadMeetings()
  }

  async function updateMeeting(id: string, updates: Partial<Meeting>) {
    const { error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    
    await loadMeetings()
  }

  // Stats & Filters
  function getFilteredVisitors(filters: {
    status?: string
    meeting_id?: string
    pic_id?: string
    search?: string
    date_from?: string
    date_to?: string
  }) {
    return visitors.filter(v => {
      if (filters.status && v.status !== filters.status) return false
      if (filters.meeting_id && v.meeting_id !== filters.meeting_id) return false
      if (filters.pic_id && v.pic_id !== filters.pic_id) return false
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const match = 
          v.name.toLowerCase().includes(search) ||
          v.phone?.includes(search) ||
          v.email?.toLowerCase().includes(search) ||
          v.business_field?.toLowerCase().includes(search) ||
          v.company?.toLowerCase().includes(search)
        if (!match) return false
      }
      if (filters.date_from && v.created_at < filters.date_from) return false
      if (filters.date_to && v.created_at > filters.date_to) return false
      return true
    })
  }

  function getStats(date_from?: string, date_to?: string) {
    const filtered = visitors.filter(v => {
      if (date_from && v.created_at < date_from) return false
      if (date_to && v.created_at > date_to) return false
      return true
    })

  
  function getReferrerDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(v => {
      // Exclude visitors with status 'Tidak Hadir' (no_show)
      if (v.status === 'no_show') return
      
      const referrerName = (v as any).referred_by_member_name
      if (referrerName) {
        distribution[referrerName] = (distribution[referrerName] || 0) + 1
      }
    })
    // Convert to array and sort by count
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 referrers
  }

  return {
      total: filtered.length,
      confirmed: filtered.filter(v => v.status === 'confirmed').length,
      pending: filtered.filter(v => v.status === 'followup').length,
      member: filtered.filter(v => v.status === 'member').length,
      hadir: filtered.filter(v => v.status === 'attended').length,
      interview: filtered.filter(v => v.status === 'interview').length,
    }
  }

  function getIndustryDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(v => {
      const field = v.business_field || 'Lainnya'
      distribution[field] = (distribution[field] || 0) + 1
    })
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }

  function getStatusDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(v => {
      distribution[v.status] = (distribution[v.status] || 0) + 1
    })
    return distribution
  }


  function getReferrerDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(v => {
      // Exclude visitors with status 'Tidak Hadir' (no_show)
      if (v.status === 'no_show') return
      
      const referrerName = (v as any).referred_by_member_name
      if (referrerName) {
        distribution[referrerName] = (distribution[referrerName] || 0) + 1
      }
    })
    // Convert to array and sort by count
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 referrers
  }

  return {
    visitors,
    meetings,
    pics,
    members,
    loading,
    reload: loadData,
    addVisitor,
    updateVisitor,
    deleteVisitor,
    addPic,
    updatePic,
    deletePic,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addMember,
    updateMember,
    deleteMember,
    getFilteredVisitors,
    getStats,
    getIndustryDistribution,
    getStatusDistribution,
    getReferrerDistribution,
    STATUSES,
    KANBAN_COLS,
  }
}
