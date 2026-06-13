import { NextResponse } from 'next/server'
import {
  findActiveUserByEmail,
  updatePassword,
  verifyAndUpgradePassword,
} from '@/lib/server/userService'

export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LENGTH = 6

// Verifies the old password; when newPassword is provided it also rotates the
// stored hash. Credential-based (not session-based) so users can recover from
// the login screen, matching the existing UX.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const oldPassword = typeof body?.oldPassword === 'string' ? body.oldPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!email || !oldPassword) {
      return NextResponse.json({ error: 'Email dan password lama wajib diisi.' }, { status: 400 })
    }

    const user = await findActiveUserByEmail(email, true)

    if (!user || !(await verifyAndUpgradePassword(user, oldPassword))) {
      return NextResponse.json({ error: 'Email atau password lama salah.' }, { status: 401 })
    }

    if (!newPassword) {
      return NextResponse.json({ success: true, verified: true })
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.` },
        { status: 400 }
      )
    }

    if (newPassword === oldPassword) {
      return NextResponse.json(
        { error: 'Password baru harus berbeda dari password lama.' },
        { status: 400 }
      )
    }

    await updatePassword(user.id, newPassword)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Gagal mengubah password.' }, { status: 500 })
  }
}
