import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Baru Daftar',
  followup: 'Follow Up',
  confirmed: 'Konfirmasi Hadir',
  attended: 'Hadir',
  no_show: 'Tidak Hadir',
  interview: 'Interview',
  member: 'Jadi Member',
  not_continue: 'Tidak Lanjut',
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

const supabaseServer = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

function countBy<T>(items: T[], getKey: (item: T) => string | undefined | null) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) || 'Tidak ada data'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function topEntries(record: Record<string, number>, limit = 12) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

function cleanVisitor(visitor: any) {
  return {
    nama: visitor.name,
    status: STATUS_LABELS[visitor.status] || visitor.status,
    gender: visitor.gender || null,
    no_wa: visitor.phone || null,
    email: visitor.email || null,
    bidang_usaha: visitor.business_field || null,
    perusahaan: visitor.company || null,
    chapter: visitor.chapter || null,
    pic: visitor.pic?.name || null,
    pic_bisnis: visitor.pic?.business_classification || null,
    meeting: visitor.meeting?.title || null,
    tanggal_meeting: visitor.meeting?.meeting_date || visitor.meeting_date || null,
    diajak_oleh: visitor.referred_by_member?.name || visitor.referral_name || null,
    catatan: visitor.notes || null,
    dibuat: visitor.created_at || null,
    diubah: visitor.updated_at || null,
  }
}

async function buildDashboardContext() {
  if (!supabaseServer) throw new Error('Supabase env belum lengkap')

  const [visitorsResult, meetingsResult, picsResult, membersResult] = await Promise.all([
    supabaseServer
      .from('visitors')
      .select(`
        id, name, phone, email, business_field, company, chapter, gender, referral_name,
        meeting_id, meeting_date, pic_id, status, notes, attended_choice_number,
        attended_choice_note, created_at, updated_at,
        pic:pic_id (id, name, business_classification),
        meeting:meeting_id (id, title, meeting_date),
        referred_by_member:referred_by_member_id (id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(500),
    supabaseServer
      .from('meetings')
      .select('id, title, meeting_date, location, notes')
      .order('meeting_date', { ascending: false })
      .limit(50),
    supabaseServer
      .from('users')
      .select('id, name, role, phone, business_classification, is_active')
      .eq('role', 'pic')
      .eq('is_active', true)
      .limit(50),
    supabaseServer
      .from('members')
      .select('id, name, phone, email, business_field, company, chapter, status, created_at')
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  if (visitorsResult.error) throw visitorsResult.error
  if (meetingsResult.error) throw meetingsResult.error
  if (picsResult.error) throw picsResult.error
  if (membersResult.error) throw membersResult.error

  const visitors = visitorsResult.data || []
  const meetings = meetingsResult.data || []
  const pics = picsResult.data || []
  const members = membersResult.data || []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

  const missingData = visitors.filter((visitor: any) => {
    const cleanPhone = (visitor.phone || '').replace(/[^0-9]/g, '')
    return !cleanPhone || cleanPhone.length < 9 || !visitor.pic_id || (!visitor.meeting_id && !visitor.meeting_date)
  })

  const reminderH1 = visitors.filter((visitor: any) => {
    if (visitor.status !== 'confirmed') return false
    const rawDate = visitor.meeting?.meeting_date || visitor.meeting_date
    if (!rawDate) return false
    const meetingDate = new Date(rawDate)
    meetingDate.setHours(0, 0, 0, 0)
    return meetingDate >= tomorrow && meetingDate < dayAfterTomorrow
  })

  return {
    generated_at: new Date().toISOString(),
    app: 'BNI Grow Visitor Manager',
    summary: {
      total_visitor: visitors.length,
      total_member_grow: members.length,
      total_pic_aktif: pics.length,
      total_weekly_meeting: meetings.length,
      perlu_follow_up: visitors.filter((visitor: any) => ['new', 'followup'].includes(visitor.status)).length,
      belum_assigned_pic: visitors.filter((visitor: any) => !visitor.pic_id).length,
      data_quality_butuh_dilengkapi: missingData.length,
      reminder_h_minus_1: reminderH1.length,
    },
    distribusi_status: topEntries(countBy(visitors, (visitor: any) => STATUS_LABELS[visitor.status] || visitor.status), 20),
    top_industri: topEntries(countBy(visitors, (visitor: any) => visitor.business_field), 20),
    top_diajak_oleh: topEntries(countBy(visitors, (visitor: any) => visitor.referred_by_member?.name || visitor.referral_name), 20),
    distribusi_pic: topEntries(countBy(visitors, (visitor: any) => visitor.pic?.name), 20),
    weekly_meetings: meetings.map((meeting: any) => ({
      title: meeting.title,
      tanggal: meeting.meeting_date,
      lokasi: meeting.location || null,
    })),
    pic_aktif: pics.map((pic: any) => ({
      nama: pic.name,
      wa: pic.phone || null,
      klasifikasi_bisnis: pic.business_classification || null,
    })),
    reminder_h_minus_1: reminderH1.slice(0, 30).map(cleanVisitor),
    data_quality_issues: missingData.slice(0, 30).map(cleanVisitor),
    visitor_terbaru: visitors.slice(0, 40).map(cleanVisitor),
    visitor_records: visitors.map(cleanVisitor),
    member_records: members.map((member: any) => ({
      nama: member.name,
      status: member.status,
      bidang_usaha: member.business_field || null,
      perusahaan: member.company || null,
      chapter: member.chapter || null,
      dibuat: member.created_at || null,
    })),
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Konfigurasi Supabase belum lengkap.' }, { status: 500 })
    }

    const body = await request.json()
    const messages = Array.isArray(body.messages) ? body.messages as ChatMessage[] : []
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const prompt = messages[messages.length - 1]?.content?.trim() || ''

    if (!userId) {
      return NextResponse.json({ error: 'Sesi user tidak ditemukan. Silakan login ulang.' }, { status: 401 })
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, name, role, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'Sesi user tidak valid. Silakan login ulang.' }, { status: 401 })
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Pertanyaan masih kosong.' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY belum diset di server.' }, { status: 500 })
    }

    const dashboardContext = await buildDashboardContext()
    const safeMessages = messages.slice(-8).map(message => ({
      role: message.role,
      content: String(message.content || '').slice(0, 1600),
    }))

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content:
              'Kamu adalah Grow Assistant, AI assistant internal untuk BNI Grow Visitor Manager. Jawab dalam bahasa Indonesia yang ringkas, jelas, natural, dan actionable. Gunakan hanya konteks data dashboard yang diberikan. Jika data tidak tersedia, bilang jujur bahwa datanya belum ada di konteks. Jangan mengarang. Jangan tampilkan markdown, jangan pakai tanda **, jangan bullet markdown yang kaku, jangan heading markdown, dan jangan menulis sumber/keterangan sumber. Tulis seperti obrolan chat biasa. Saat menjawab angka, sebutkan angka spesifik secara natural. Biasakan memberi next action konkret, misalnya arahkan user membuka halaman Visitor untuk follow-up, MCQA untuk proses hadir/interview/member, atau Text Format untuk template WA jika relevan. Akhiri jawaban dengan pertanyaan pendek seperti "Mau saya bantu lihat daftar prioritasnya?" atau variasinya.',
          },
          {
            role: 'system',
            content: `User aktif: ${user.name} (${user.role}). Konteks data dashboard terbaru dalam JSON:\n${JSON.stringify(dashboardContext)}`,
          },
          ...safeMessages,
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `DeepSeek error: ${response.status} ${errorText.slice(0, 240)}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const answer = data?.choices?.[0]?.message?.content

    return NextResponse.json({
      answer: answer || 'Maaf, Grow Assistant belum menerima jawaban dari model.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Grow Assistant sedang bermasalah.' },
      { status: 500 }
    )
  }
}
