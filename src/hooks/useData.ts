'use client'

import { useState, useEffect } from 'react'
import { Visitor, Meeting, VisitorStatus } from '@/lib/supabase'
import { notifyDataChanged } from '@/lib/ui/toast'
import { getLocalPicBusinessClassification } from '@/lib/picBusinessClassification'
import { apiGet, apiSend } from '@/lib/dataClient'

// Module-level cache: survives re-renders, resets on hard page refresh.
// TTL = 60s per key; mutations clear only the affected key.
const _cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 60_000

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null }
  return entry.data as T
}

function cacheSet(key: string, data: unknown) {
  _cache.set(key, { data, ts: Date.now() })
}

function cacheDel(...keys: string[]) {
  keys.forEach(k => _cache.delete(k))
}

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
  renewal_date?: string | null
  last_renewed_at?: string | null
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

// All reads/writes go through the scoped data API. Chapter isolation, identity,
// and activity logging are enforced server-side from the session — the client
// only renders what it is allowed to see.
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

  async function loadData(force = false) {
    if (force) _cache.clear()
    setLoading(true)
    await Promise.all([loadVisitors(), loadMeetings(), loadPics(), loadMembers()])
    setLoading(false)
  }

  async function loadVisitors() {
    const cached = cacheGet<VisitorWithRelations[]>('visitors')
    if (cached) { setVisitors(cached); return }
    try {
      const data = await apiGet<any[]>('visitors')
      const mapped = (data || []).map(visitor => ({
        ...visitor,
        pic_name: visitor.pic?.name,
        pic_business_classification:
          visitor.pic?.business_classification || getLocalPicBusinessClassification(visitor.pic_id),
        meeting_title: visitor.meeting?.title,
        meeting_date: visitor.meeting?.meeting_date || visitor.meeting_date,
        referred_by_member_name: visitor.referred_by_member?.name || visitor.referral_name,
      }))
      cacheSet('visitors', mapped)
      setVisitors(mapped)
    } catch (error) {
      console.error('Error loading visitors:', error)
      setVisitors([])
    }
  }

  async function loadMeetings() {
    const cached = cacheGet<Meeting[]>('meetings')
    if (cached) { setMeetings(cached); return }
    try {
      const data = await apiGet<Meeting[]>('meetings')
      cacheSet('meetings', data)
      setMeetings(data)
    } catch (error) {
      console.error('Error loading meetings:', error)
      setMeetings([])
    }
  }

  async function loadPics() {
    const cached = cacheGet<PIC[]>('pics')
    if (cached) { setPics(cached); return }
    try {
      const data = await apiGet<any[]>('pics')
      const mapped = (data || []).map(pic => ({
        id: pic.id,
        name: pic.name,
        role: pic.role || 'PIC',
        wa: pic.phone || '',
        email: pic.email || '',
        business_classification: pic.business_classification || getLocalPicBusinessClassification(pic.id),
        is_active: pic.is_active,
      }))
      cacheSet('pics', mapped)
      setPics(mapped)
    } catch (error) {
      console.error('Error loading PICs:', error)
      setPics([])
    }
  }

  async function loadMembers() {
    const cached = cacheGet<Member[]>('members')
    if (cached) { setMembers(cached); return }
    try {
      const data = await apiGet<Member[]>('members')
      cacheSet('members', data)
      setMembers(data)
    } catch (error) {
      console.error('Error loading members:', error)
      setMembers([])
    }
  }

  async function addMember(member: Partial<Member>) {
    const data = await apiSend<Member>('members', 'POST', member as Record<string, unknown>)
    cacheDel('members')
    await loadMembers()
    notifyDataChanged('insert')
    return data
  }

  async function updateMember(id: string, member: Partial<Member>) {
    const data = await apiSend<Member>(`members/${id}`, 'PATCH', member as Record<string, unknown>)
    cacheDel('members')
    await loadMembers()
    notifyDataChanged('update')
    return data
  }

  async function deleteMember(id: string) {
    await apiSend(`members/${id}`, 'DELETE')
    cacheDel('members')
    await loadMembers()
    notifyDataChanged('delete')
  }

  async function addVisitor(visitor: Partial<Visitor>) {
    const data = await apiSend<Visitor>('visitors', 'POST', visitor as Record<string, unknown>)
    cacheDel('visitors')
    await loadVisitors()
    notifyDataChanged('insert')
    return data
  }

  async function updateVisitor(id: string, updates: Partial<Visitor>) {
    // Optimistic update — no need to re-fetch; just update the cached copy too
    setVisitors(prev => {
      const next = prev.map(visitor =>
        visitor.id === id ? { ...visitor, ...updates } : visitor
      )
      cacheSet('visitors', next)
      return next
    })

    try {
      await apiSend(`visitors/${id}`, 'PATCH', updates as Record<string, unknown>)
    } catch (error) {
      cacheDel('visitors')
      await loadVisitors()
      throw error
    }

    notifyDataChanged('update')
  }

  async function deleteVisitor(id: string) {
    await apiSend(`visitors/${id}`, 'DELETE')
    cacheDel('visitors')
    await loadVisitors()
    notifyDataChanged('delete')
  }

  async function addPic(pic: Omit<PIC, 'id'>) {
    const data = await apiSend<any>('pics', 'POST', {
      name: pic.name,
      email: pic.email,
      phone: pic.wa,
      business_classification: pic.business_classification,
      role: pic.role,
    })
    cacheDel('pics')
    await loadPics()
    notifyDataChanged('insert')
    return {
      id: data.id,
      name: data.name,
      role: data.role || 'PIC',
      wa: data.phone || '',
      email: data.email || '',
      business_classification: data.business_classification || '',
      is_active: data.is_active,
    } as PIC
  }

  async function updatePic(id: string, updates: Partial<PIC>) {
    await apiSend(`pics/${id}`, 'PATCH', {
      name: updates.name,
      phone: updates.wa,
      business_classification: updates.business_classification,
      role: updates.role,
    })
    cacheDel('pics')
    await loadPics()
    notifyDataChanged('update')
  }

  async function deletePic(id: string) {
    await apiSend(`pics/${id}`, 'DELETE')
    cacheDel('pics')
    await loadPics()
    notifyDataChanged('delete')
  }

  async function addMeeting(meeting: Partial<Meeting>) {
    const data = await apiSend<Meeting>('meetings', 'POST', meeting as Record<string, unknown>)
    cacheDel('meetings')
    await loadMeetings()
    notifyDataChanged('insert')
    return data
  }

  async function updateMeeting(id: string, updates: Partial<Meeting>) {
    await apiSend(`meetings/${id}`, 'PATCH', updates as Record<string, unknown>)
    cacheDel('meetings')
    await loadMeetings()
    notifyDataChanged('update')
  }

  async function deleteMeeting(id: string) {
    await apiSend(`meetings/${id}`, 'DELETE')
    cacheDel('meetings')
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
    reload: () => loadData(true),
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
