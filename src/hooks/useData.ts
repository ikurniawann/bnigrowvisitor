'use client'

import { useState, useEffect } from 'react'
import { supabase, Visitor, Meeting, VisitorStatus, User } from '@/lib/supabase'
import { notifyDataChanged } from '@/lib/ui/toast'
import { getLocalPicBusinessClassification } from '@/lib/picBusinessClassification'
import { logActivity } from '@/lib/activityLog'
import { isNationalAdmin } from '@/lib/permissions'

export interface PIC {
  id: string
  name: string
  role: string
  wa: string
  email?: string
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
  chapter_id?: string
  name: string
  phone?: string
  email?: string
  business_field?: string
  company?: string
  chapter?: string
  joined_date: string
  status: string
  notes?: string
  account_role?: string
  account_active?: boolean
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

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null

  try {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

function getSelectedChapterId(): string {
  if (typeof window === 'undefined') return ''

  try {
    const routeMatch = window.location.pathname.match(/^\/chapter\/([^/]+)/)
    if (routeMatch?.[1]) return decodeURIComponent(routeMatch[1])

    const storedContext = localStorage.getItem('selectedChapterContext')
    const context = storedContext ? JSON.parse(storedContext) : null
    if (context?.chapter?.id) return context.chapter.id

    const storedTenant = localStorage.getItem('tenantContext')
    const tenantContext = storedTenant ? JSON.parse(storedTenant) : null
    return tenantContext?.chapter?.id || ''
  } catch {
    return ''
  }
}

export function useData() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [visitors, setVisitors] = useState<VisitorWithRelations[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [pics, setPics] = useState<PIC[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = getStoredUser()
    setCurrentUser(storedUser)
    loadData(storedUser)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyChapterScope<T = any>(query: T, user = currentUser): T {
    if (!user) return query

    const selectedChapterId = getSelectedChapterId()

    if (isNationalAdmin(user)) {
      return selectedChapterId ? (query as any).eq('chapter_id', selectedChapterId) : query
    }

    if (!user.chapter_id) {
      return (query as any).eq('chapter_id', '__missing_chapter__')
    }

    return (query as any).eq('chapter_id', user.chapter_id)
  }

  // Only chapter_id is injected here: visitors/members/meetings have no
  // organization_id column. Tables that do (users) set it explicitly.
  function withCreateScope<T extends Record<string, any>>(payload: T, user = currentUser): T {
    const scopedPayload: Record<string, any> = { ...payload }
    const selectedChapterId = getSelectedChapterId()

    if (!scopedPayload.chapter_id) {
      if (isNationalAdmin(user) && selectedChapterId) {
        scopedPayload.chapter_id = selectedChapterId
      } else if (user?.chapter_id) {
        scopedPayload.chapter_id = user.chapter_id
      }
    }

    return scopedPayload as T
  }

  async function loadData(user = currentUser) {
    setLoading(true)
    await Promise.all([loadVisitors(user), loadMeetings(user), loadPics(user), loadMembers(user)])
    setLoading(false)
  }

  async function loadVisitors(user = currentUser) {
    const query = applyChapterScope(supabase
      .from('visitors')
      .select(`
        *,
        pic:pic_id (id, name, business_classification),
        meeting:meeting_id (id, title, meeting_date),
        referred_by_member:referred_by_member_id (id, name)
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }), user)

    let { data, error } = await query

    if (error && error.message?.includes('business_classification')) {
      const fallback = await applyChapterScope(supabase
        .from('visitors')
        .select(`
          *,
          pic:pic_id (id, name),
          meeting:meeting_id (id, title, meeting_date),
          referred_by_member:referred_by_member_id (id, name)
        `)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }), user)

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

  async function loadMeetings(user = currentUser) {
    const { data, error } = await applyChapterScope(supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false }), user)

    if (error) {
      console.error('Error loading meetings:', error)
      setMeetings([])
      return
    }

    setMeetings(data || [])
  }

  async function loadPics(user = currentUser) {
    let { data, error }: { data: any[] | null; error: any } = await applyChapterScope(supabase
      .from('users')
      .select('id, name, email, role, phone, business_classification, is_active')
      .eq('role', 'pic')
      .eq('is_active', true), user)

    if (error && error.message?.includes('business_classification')) {
      const fallback = await applyChapterScope(supabase
        .from('users')
        .select('id, name, email, role, phone, is_active')
        .eq('role', 'pic')
        .eq('is_active', true), user)

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
      email: pic.email || '',
      business_classification: pic.business_classification || getLocalPicBusinessClassification(pic.id),
      is_active: pic.is_active,
    })))
  }

  async function loadMembers(user = currentUser) {
    const { data, error } = await applyChapterScope(supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }), user)

    if (error) {
      console.error('Error loading members:', error)
      setMembers([])
      return
    }

    const memberRows = data || []
    const memberEmailValues = Array.from(new Set(
      memberRows
        .map(member => member.email?.trim())
        .filter(Boolean)
    ))

    let accountByEmail = new Map<string, { role: string; is_active: boolean }>()

    if (memberEmailValues.length > 0) {
      const { data: accounts, error: accountError } = await applyChapterScope(supabase
        .from('users')
        .select('email, role, is_active')
        .in('email', memberEmailValues), user)

      if (accountError) {
        console.error('Error loading member accounts:', accountError)
      } else {
        accountByEmail = new Map(
          (accounts || []).map(account => [
            account.email?.trim().toLowerCase(),
            { role: account.role, is_active: account.is_active },
          ])
        )
      }
    }

    setMembers(memberRows.map(member => {
      const account = member.email ? accountByEmail.get(member.email.trim().toLowerCase()) : undefined
      return {
        ...member,
        account_role: account?.role,
        account_active: account?.is_active,
      }
    }))
  }

  async function addMember(member: Partial<Member>) {
    const { data, error } = await supabase
      .from('members')
      .insert(withCreateScope(member))
      .select()
      .single()

    if (error) throw error
    await loadMembers()
    await logActivity({
      action: 'insert',
      entity: 'member',
      entityId: data.id,
      entityLabel: data.name,
      newData: data as Record<string, unknown>,
    })
    notifyDataChanged('insert')
    return data
  }

  async function updateMember(id: string, member: Partial<Member>) {
    const oldMember = members.find(item => item.id === id)
    const query = applyChapterScope(supabase
      .from('members')
      .update(member)
      .eq('id', id))

    const { data, error } = await query
      .select()
      .single()

    if (error) throw error
    await loadMembers()
    await logActivity({
      action: 'update',
      entity: 'member',
      entityId: id,
      entityLabel: data.name || oldMember?.name,
      oldData: oldMember as Record<string, unknown> | undefined,
      newData: data as Record<string, unknown>,
    })
    notifyDataChanged('update')
    return data
  }

  async function deleteMember(id: string) {
    const oldMember = members.find(item => item.id === id)
    const { error } = await applyChapterScope(supabase
      .from('members')
      .delete()
      .eq('id', id))

    if (error) throw error
    await loadMembers()
    await logActivity({
      action: 'delete',
      entity: 'member',
      entityId: id,
      entityLabel: oldMember?.name,
      oldData: oldMember as Record<string, unknown> | undefined,
    })
    notifyDataChanged('delete')
  }

  async function addVisitor(visitor: Partial<Visitor>) {
    const { data, error } = await supabase
      .from('visitors')
      .insert(withCreateScope(visitor))
      .select()
      .single()

    if (error) throw error
    await loadVisitors()
    await logActivity({
      action: 'insert',
      entity: 'visitor',
      entityId: data.id,
      entityLabel: data.name,
      newData: data as Record<string, unknown>,
    })
    notifyDataChanged('insert')
    return data
  }

  async function updateVisitor(id: string, updates: Partial<Visitor>) {
    const oldVisitor = visitors.find(visitor => visitor.id === id)
    setVisitors(prev => prev.map(visitor =>
      visitor.id === id ? { ...visitor, ...updates } : visitor
    ))

    const { error } = await applyChapterScope(supabase
      .from('visitors')
      .update(updates)
      .eq('id', id))

    if (error) {
      await loadVisitors()
      throw error
    }

    await logActivity({
      action: 'update',
      entity: 'visitor',
      entityId: id,
      entityLabel: oldVisitor?.name,
      oldData: oldVisitor as Record<string, unknown> | undefined,
      newData: { ...oldVisitor, ...updates } as Record<string, unknown>,
      metadata: { updates },
    })
    notifyDataChanged('update')
  }

  async function deleteVisitor(id: string) {
    const oldVisitor = visitors.find(visitor => visitor.id === id)
    const { error } = await applyChapterScope(supabase
      .from('visitors')
      .delete()
      .eq('id', id))

    if (error) throw error
    await loadVisitors()
    await logActivity({
      action: 'delete',
      entity: 'visitor',
      entityId: id,
      entityLabel: oldVisitor?.name,
      oldData: oldVisitor as Record<string, unknown> | undefined,
    })
    notifyDataChanged('delete')
  }

  async function addPic(pic: Omit<PIC, 'id'>) {
    // Placeholder credential until the PIC sets a real password; random so the
    // account can't be logged into with a guessable default.
    const placeholderPassword = `unset-${crypto.randomUUID()}`
    const basePayload = {
      email: `pic+${Date.now()}@bnigrow.com`,
      role: 'pic',
      password_hash: placeholderPassword,
      is_active: true,
      organization_id: currentUser?.organization_id,
    }

    let { data, error }: { data: any | null; error: any } = await supabase
      .from('users')
      .insert(withCreateScope({
        ...basePayload,
        name: pic.name,
        phone: pic.wa,
        business_classification: pic.business_classification,
      }))
      .select('id, name, role, phone, business_classification, is_active')
      .single()

    if (error && error.message?.includes('business_classification')) {
      const fallback = await supabase
        .from('users')
        .insert(withCreateScope({
          ...basePayload,
          name: pic.name,
          phone: pic.wa,
        }))
        .select('id, name, role, phone, is_active')
        .single()

      data = fallback.data
      error = fallback.error
    }

    if (error) throw error
    await loadPics()
    await logActivity({
      action: 'insert',
      entity: 'pic',
      entityId: data.id,
      entityLabel: data.name,
      newData: data as Record<string, unknown>,
    })
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
    const oldPic = pics.find(pic => pic.id === id)
    let { error } = await applyChapterScope(supabase
      .from('users')
      .update({
        name: updates.name,
        role: updates.role,
        phone: updates.wa,
        business_classification: updates.business_classification,
      })
      .eq('id', id))

    if (error && error.message?.includes('business_classification')) {
      const fallback = await applyChapterScope(supabase
        .from('users')
        .update({
          name: updates.name,
          role: updates.role,
          phone: updates.wa,
        })
        .eq('id', id))

      error = fallback.error
    }

    if (error) throw error
    await loadPics()
    await logActivity({
      action: 'update',
      entity: 'pic',
      entityId: id,
      entityLabel: updates.name || oldPic?.name,
      oldData: oldPic as Record<string, unknown> | undefined,
      newData: { ...oldPic, ...updates } as Record<string, unknown>,
      metadata: { updates },
    })
    notifyDataChanged('update')
  }

  async function deletePic(id: string) {
    const oldPic = pics.find(pic => pic.id === id)
    const { error } = await applyChapterScope(supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id))

    if (error) throw error
    await loadPics()
    await logActivity({
      action: 'delete',
      entity: 'pic',
      entityId: id,
      entityLabel: oldPic?.name,
      oldData: oldPic as Record<string, unknown> | undefined,
      newData: { ...oldPic, is_active: false } as Record<string, unknown>,
    })
    notifyDataChanged('delete')
  }

  async function addMeeting(meeting: Partial<Meeting>) {
    const { data, error } = await supabase
      .from('meetings')
      .insert(withCreateScope(meeting))
      .select()
      .single()

    if (error) throw error
    await loadMeetings()
    await logActivity({
      action: 'insert',
      entity: 'meeting',
      entityId: data.id,
      entityLabel: data.title,
      newData: data as Record<string, unknown>,
    })
    notifyDataChanged('insert')
    return data
  }

  async function updateMeeting(id: string, updates: Partial<Meeting>) {
    const oldMeeting = meetings.find(meeting => meeting.id === id)
    const { error } = await applyChapterScope(supabase
      .from('meetings')
      .update(updates)
      .eq('id', id))

    if (error) throw error
    await loadMeetings()
    await logActivity({
      action: 'update',
      entity: 'meeting',
      entityId: id,
      entityLabel: updates.title || oldMeeting?.title,
      oldData: oldMeeting as Record<string, unknown> | undefined,
      newData: { ...oldMeeting, ...updates } as Record<string, unknown>,
      metadata: { updates },
    })
    notifyDataChanged('update')
  }

  async function deleteMeeting(id: string) {
    const oldMeeting = meetings.find(meeting => meeting.id === id)
    const { error } = await applyChapterScope(supabase
      .from('meetings')
      .delete()
      .eq('id', id))

    if (error) throw error
    await loadMeetings()
    await logActivity({
      action: 'delete',
      entity: 'meeting',
      entityId: id,
      entityLabel: oldMeeting?.title,
      oldData: oldMeeting as Record<string, unknown> | undefined,
    })
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
      attended: filtered.filter(visitor => ['attended', 'interview', 'member', 'not_continue'].includes(visitor.status)).length,
      no_show: filtered.filter(visitor => visitor.status === 'no_show').length,
      interview: filtered.filter(visitor => visitor.status === 'interview').length,
      not_continue: filtered.filter(visitor => visitor.status === 'not_continue').length,
      hadir: filtered.filter(visitor => ['attended', 'interview', 'member', 'not_continue'].includes(visitor.status)).length,
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
      .slice(0, 10)
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
