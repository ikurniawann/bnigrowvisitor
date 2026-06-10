'use client'

import { useState, useEffect } from 'react'
import { supabase, Visitor, Meeting, VisitorStatus } from '@/lib/supabase'
import { notifyDataChanged } from '@/lib/ui/toast'
import { getLocalPicBusinessClassification } from '@/lib/picBusinessClassification'

export interface PIC {
  id: string
  name: string
  role: string
  wa: string
  business_classification?: string
  is_active?: boolean
}

export interface VisitorWithRelations extends Visitor {
  pic_name?: string
  pic_business_classification?: string
  meeting_title?: string
  meeting_date?: string
  referred_by_member_id?: string
  referred_by_member_name?: string
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

export const STATUSES: Record<VisitorStatus, { label: string; color: string }> = {
  new: { label: 'Baru Daftar', color: '#dbeafe' },
  followup: { label: 'Follow Up', color: '#fef3c7' },
  confirmed: { label: 'Konfirmasi Hadir', color: '#dcfce7' },
  attended: { label: 'Hadir', color: '#d1fae5' },
  no_show: { label: 'Tidak Hadir', color: '#fee2e2' },
  interview: { label: 'Interview', color: '#ede9fe' },
  member: { label: 'Jadi Member', color: '#ccfbf1' },
  not_continue: { label: 'Tidak Lanjut', color: '#f3f4f6' },
}

export const KANBAN_COLS = ['new', 'followup', 'confirmed', 'attended', 'interview', 'member'] as const

export function useData() {
  const [visitors, setVisitors] = useState<VisitorWithRelations[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [pics, setPics] = useState<PIC[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    await Promise.all([loadVisitors(), loadMeetings(), loadPics(), loadMembers()])
    setLoading(false)
  }

  async function loadVisitors() {
    const query = supabase
      .from('visitors')
      .select(`
        *,
        pic:pic_id (id, name, business_classification),
        meeting:meeting_id (id, title, meeting_date),
        referred_by_member:referred_by_member_id (id, name)
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    let { data, error } = await query

    if (error && error.message?.includes('business_classification')) {
      const fallback = await supabase
        .from('visitors')
        .select(`
          *,
          pic:pic_id (id, name),
          meeting:meeting_id (id, title, meeting_date),
          referred_by_member:referred_by_member_id (id, name)
        `)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('Error loading visitors:', error)
      setVisitors([])
      return
    }

    setVisitors((data || []).map((visitor: any) => ({
      ...visitor,
      pic_name: visitor.pic?.name,
      pic_business_classification: visitor.pic?.business_classification || getLocalPicBusinessClassification(visitor.pic_id),
      meeting_title: visitor.meeting?.title,
      meeting_date: visitor.meeting?.meeting_date || visitor.meeting_date,
      referred_by_member_name: visitor.referred_by_member?.name || visitor.referral_name,
    })))
  }

  async function loadMeetings() {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false })

    if (error) {
      console.error('Error loading meetings:', error)
      setMeetings([])
      return
    }

    setMeetings(data || [])
  }

  async function loadPics() {
    let { data, error }: { data: any[] | null; error: any } = await supabase
      .from('users')
      .select('id, name, role, phone, business_classification, is_active')
      .eq('role', 'pic')
      .eq('is_active', true)

    if (error && error.message?.includes('business_classification')) {
      const fallback = await supabase
        .from('users')
        .select('id, name, role, phone, is_active')
        .eq('role', 'pic')
        .eq('is_active', true)

      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('Error loading PICs:', error)
      setPics([])
      return
    }

    setPics((data || []).map(pic => ({
      id: pic.id,
      name: pic.name,
      role: pic.role || 'PIC',
      wa: pic.phone || '',
      business_classification: pic.business_classification || getLocalPicBusinessClassification(pic.id),
      is_active: pic.is_active,
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

  async function addMember(member: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single()

    if (error) throw error
    await loadMembers()
    notifyDataChanged('insert')
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
    await loadMembers()
    notifyDataChanged('update')
    return data
  }

  async function deleteMember(id: string) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)

    if (error) throw error
    await loadMembers()
    notifyDataChanged('delete')
  }

  async function addVisitor(visitor: Partial<Visitor>) {
    const { data, error } = await supabase
      .from('visitors')
      .insert(visitor)
      .select()
      .single()

    if (error) throw error
    await loadVisitors()
    notifyDataChanged('insert')
    return data
  }

  async function updateVisitor(id: string, updates: Partial<Visitor>) {
    setVisitors(prev => prev.map(visitor =>
      visitor.id === id ? { ...visitor, ...updates } : visitor
    ))

    const { error } = await supabase
      .from('visitors')
      .update(updates)
      .eq('id', id)

    if (error) {
      await loadVisitors()
      throw error
    }

    notifyDataChanged('update')
  }

  async function deleteVisitor(id: string) {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id)

    if (error) throw error
    await loadVisitors()
    notifyDataChanged('delete')
  }

  async function addPic(pic: Omit<PIC, 'id'>) {
    let { data, error }: { data: any | null; error: any } = await supabase
      .from('users')
      .insert({
        name: pic.name,
        email: `pic+${Date.now()}@bnigrow.com`,
        role: 'pic',
        phone: pic.wa,
        business_classification: pic.business_classification,
        password_hash: 'temp',
        is_active: true,
      })
      .select('id, name, role, phone, business_classification, is_active')
      .single()

    if (error && error.message?.includes('business_classification')) {
      const fallback = await supabase
        .from('users')
        .insert({
          name: pic.name,
          email: `pic+${Date.now()}@bnigrow.com`,
          role: 'pic',
          phone: pic.wa,
          password_hash: 'temp',
          is_active: true,
        })
        .select('id, name, role, phone, is_active')
        .single()

      data = fallback.data
      error = fallback.error
    }

    if (error) throw error
    await loadPics()
    notifyDataChanged('insert')

    return {
      id: data.id,
      name: data.name,
      role: data.role || 'PIC',
      wa: data.phone || '',
      business_classification: data.business_classification || '',
      is_active: data.is_active,
    }
  }

  async function updatePic(id: string, updates: Partial<PIC>) {
    let { error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        role: updates.role,
        phone: updates.wa,
        business_classification: updates.business_classification,
      })
      .eq('id', id)

    if (error && error.message?.includes('business_classification')) {
      const fallback = await supabase
        .from('users')
        .update({
          name: updates.name,
          role: updates.role,
          phone: updates.wa,
        })
        .eq('id', id)

      error = fallback.error
    }

    if (error) throw error
    await loadPics()
    notifyDataChanged('update')
  }

  async function deletePic(id: string) {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
    await loadPics()
    notifyDataChanged('delete')
  }

  async function addMeeting(meeting: Partial<Meeting>) {
    const { data, error } = await supabase
      .from('meetings')
      .insert(meeting)
      .select()
      .single()

    if (error) throw error
    await loadMeetings()
    notifyDataChanged('insert')
    return data
  }

  async function updateMeeting(id: string, updates: Partial<Meeting>) {
    const { error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    await loadMeetings()
    notifyDataChanged('update')
  }

  async function deleteMeeting(id: string) {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) throw error
    await loadMeetings()
    notifyDataChanged('delete')
  }

  function getFilteredVisitors(filters: {
    status?: string
    meeting_id?: string
    pic_id?: string
    search?: string
    date_from?: string
    date_to?: string
  }) {
    return visitors.filter(visitor => {
      if (filters.status && visitor.status !== filters.status) return false
      if (filters.meeting_id && visitor.meeting_id !== filters.meeting_id) return false
      if (filters.pic_id && visitor.pic_id !== filters.pic_id) return false
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesSearch =
          visitor.name.toLowerCase().includes(search) ||
          visitor.phone?.includes(search) ||
          visitor.email?.toLowerCase().includes(search) ||
          visitor.business_field?.toLowerCase().includes(search) ||
          visitor.company?.toLowerCase().includes(search)

        if (!matchesSearch) return false
      }
      if (filters.date_from && visitor.created_at < filters.date_from) return false
      if (filters.date_to && visitor.created_at > filters.date_to) return false
      return true
    })
  }

  function getStats(date_from?: string, date_to?: string) {
    const filtered = visitors.filter(visitor => {
      if (date_from && visitor.created_at < date_from) return false
      if (date_to && visitor.created_at > date_to) return false
      return true
    })

    return {
      total: filtered.length,
      confirmed: filtered.filter(visitor => visitor.status === 'confirmed').length,
      pending: filtered.filter(visitor => visitor.status === 'followup').length,
      member: filtered.filter(visitor => visitor.status === 'member').length,
      attended: filtered.filter(visitor => visitor.status === 'attended').length,
      no_show: filtered.filter(visitor => visitor.status === 'no_show').length,
      interview: filtered.filter(visitor => visitor.status === 'interview').length,
      not_continue: filtered.filter(visitor => visitor.status === 'not_continue').length,
      hadir: filtered.filter(visitor => visitor.status === 'attended').length,
    }
  }

  function getIndustryDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(visitor => {
      const field = visitor.business_field || 'Lainnya'
      distribution[field] = (distribution[field] || 0) + 1
    })

    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }

  function getStatusDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(visitor => {
      distribution[visitor.status] = (distribution[visitor.status] || 0) + 1
    })

    return distribution
  }

  function getReferrerDistribution() {
    const distribution: Record<string, number> = {}
    visitors.forEach(visitor => {
      if (visitor.status === 'no_show') return

      const referrerName = visitor.referred_by_member_name || visitor.referral_name
      if (referrerName) {
        distribution[referrerName] = (distribution[referrerName] || 0) + 1
      }
    })

    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
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
