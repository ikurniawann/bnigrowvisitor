import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session'
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin'
import { hashPassword } from '@/lib/server/userService'

export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LENGTH = 6

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Silakan login ulang.' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const action = body?.action as string

    if (action === 'reset-password') {
      const { currentPassword, newPassword } = body

      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Password lama dan baru wajib diisi.' }, { status: 400 })
      }

      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.` },
          { status: 400 },
        )
      }

      const admin = getSupabaseAdmin()

      const { data: userRow, error: fetchError } = await admin
        .from('users')
        .select('id, password_hash')
        .eq('id', session.sub)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!userRow) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 })

      const isMatch = await bcrypt.compare(currentPassword, userRow.password_hash || '')
      if (!isMatch) {
        return NextResponse.json({ error: 'Password lama tidak sesuai.' }, { status: 401 })
      }

      const newHash = await hashPassword(newPassword)
      const { error: updateError } = await admin
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', session.sub)

      if (updateError) throw updateError

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
