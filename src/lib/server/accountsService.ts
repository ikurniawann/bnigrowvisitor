import 'server-only'
import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from './supabaseAdmin'
import { SessionPayload } from './session'
import { ChapterScope, applyScope, ScopeError } from './chapterScope'
import { writeActivityLog } from './activityLogService'
import { hashPassword } from './userService'

const ADMIN_ROLES = ['admin', 'national_admin', 'chapter_admin']
const PIC_SELECT = 'id, name, email, role, phone, business_classification, is_active'

// A PIC account always carries an unguessable placeholder password until the
// person sets a real one through the auth flow.
function placeholderHash(): string {
  return `unset-${randomUUID()}`
}

export interface PicInput {
  name: string
  email?: string
  phone?: string
  business_classification?: string
  role?: string
}

export async function listPics(scope: ChapterScope) {
  const query = applyScope(
    getSupabaseAdmin()
      .from('users')
      .select(PIC_SELECT)
      .eq('role', 'pic')
      .eq('is_active', true),
    scope
  )
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findUserByEmail(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('id, name, email, role, chapter_id, is_active')
    .eq('email', email)
    .maybeSingle()
  if (error) throw error
  return data
}

// Guards an existing account against being hijacked across roles/chapters.
function assertAccountAssignable(
  account: { role?: string; chapter_id?: string | null } | null,
  scope: ChapterScope,
  email: string
) {
  if (!account) return
  if (account.role && ADMIN_ROLES.includes(account.role)) {
    throw new ScopeError(`Email ${email} sudah dipakai akun admin. Gunakan email lain.`, 409)
  }
  if (
    !scope.isNational &&
    account.chapter_id &&
    scope.chapterId &&
    account.chapter_id !== scope.chapterId
  ) {
    throw new ScopeError(`Email ${email} sudah dipakai akun di chapter lain.`, 409)
  }
}

// Promotes a member into a PIC account (or refreshes an existing one). Chapter
// and organization come from the server scope, never the client.
export async function createPic(
  session: SessionPayload,
  scope: ChapterScope,
  input: PicInput
) {
  if (!scope.chapterId) throw new ScopeError('Chapter tujuan wajib dipilih.', 400)
  if (!input.name?.trim()) throw new ScopeError('Nama PIC wajib diisi.', 400)

  const email = (input.email?.trim() || `pic+${randomUUID()}@bnigrow.com`).toLowerCase()
  const admin = getSupabaseAdmin()
  const existing = await findUserByEmail(email)
  assertAccountAssignable(existing, scope, email)

  const base = {
    name: input.name.trim(),
    role: 'pic',
    phone: input.phone?.trim() || null,
    business_classification: input.business_classification?.trim() || null,
    is_active: true,
    organization_id: scope.organizationId,
    chapter_id: scope.chapterId,
  }

  let row
  if (existing?.id) {
    const { data, error } = await admin
      .from('users')
      .update(base)
      .eq('id', existing.id)
      .select(PIC_SELECT)
      .single()
    if (error) throw error
    row = data
  } else {
    const { data, error } = await admin
      .from('users')
      .insert({ ...base, email, password_hash: placeholderHash() })
      .select(PIC_SELECT)
      .single()
    if (error) throw error
    row = data
  }

  await writeActivityLog(session, scope, {
    action: existing?.id ? 'update' : 'insert',
    entity: 'pic',
    entityId: row.id,
    entityLabel: row.name,
    newData: row,
  })
  return row
}

export async function updatePic(
  session: SessionPayload,
  scope: ChapterScope,
  id: string,
  updates: Pick<PicInput, 'name' | 'phone' | 'business_classification' | 'role'>
) {
  const target = applyScope(
    getSupabaseAdmin().from('users').select('id, name, role').eq('id', id).eq('role', 'pic'),
    scope
  )
  const { data: existing, error: findError } = await target.maybeSingle()
  if (findError) throw findError
  if (!existing) throw new ScopeError('PIC tidak ditemukan pada chapter ini.', 404)

  const query = applyScope(
    getSupabaseAdmin()
      .from('users')
      .update({
        name: updates.name,
        phone: updates.phone,
        business_classification: updates.business_classification,
      })
      .eq('id', id),
    scope
  )
  const { data, error } = await query.select(PIC_SELECT).single()
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'update',
    entity: 'pic',
    entityId: id,
    entityLabel: data.name,
    oldData: existing,
    newData: data,
  })
  return data
}

export async function deactivatePic(
  session: SessionPayload,
  scope: ChapterScope,
  id: string
) {
  const target = applyScope(
    getSupabaseAdmin().from('users').select('id, name').eq('id', id).eq('role', 'pic'),
    scope
  )
  const { data: existing, error: findError } = await target.maybeSingle()
  if (findError) throw findError
  if (!existing) throw new ScopeError('PIC tidak ditemukan pada chapter ini.', 404)

  const query = applyScope(
    getSupabaseAdmin().from('users').update({ is_active: false }).eq('id', id),
    scope
  )
  const { error } = await query
  if (error) throw error

  await writeActivityLog(session, scope, {
    action: 'delete',
    entity: 'pic',
    entityId: id,
    entityLabel: existing.name,
    oldData: existing,
  })
}

export interface MemberAccountInput {
  name: string
  email: string
  phone?: string
  oldEmail?: string
  password?: string
}

// Mirrors a member's login account in the users table. Creates one when a
// password is supplied, otherwise refreshes contact details. Role of an
// existing account is preserved; scope decides the chapter.
export async function syncMemberAccount(
  session: SessionPayload,
  scope: ChapterScope,
  input: MemberAccountInput
) {
  if (!scope.chapterId) throw new ScopeError('Chapter tujuan wajib dipilih.', 400)

  const email = input.email.trim().toLowerCase()
  if (!email) return { changed: false }

  const oldEmail = input.oldEmail?.trim().toLowerCase()
  const password = input.password?.trim()
  const admin = getSupabaseAdmin()

  const lookupEmails = Array.from(new Set([oldEmail, email].filter(Boolean) as string[]))
  const { data: existingUsers, error: findError } = await admin
    .from('users')
    .select('id, email, role, chapter_id')
    .in('email', lookupEmails)
  if (findError) throw findError

  const users = existingUsers || []
  const byOld = oldEmail ? users.find(u => u.email?.toLowerCase() === oldEmail) : undefined
  const byNew = users.find(u => u.email?.toLowerCase() === email)
  const account = byOld || byNew

  if (account) {
    assertAccountAssignable(account, scope, email)

    const emailTakenByAnother = byNew && byOld && byNew.id !== byOld.id
    const updates: Record<string, unknown> = {
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      is_active: true,
      organization_id: scope.organizationId,
      chapter_id: scope.chapterId,
    }
    if (!emailTakenByAnother) updates.email = email

    const { error: updateError } = await admin.from('users').update(updates).eq('id', account.id)
    if (updateError) throw updateError

    if (password) {
      const { error: pwError } = await admin
        .from('users')
        .update({ password_hash: await hashPassword(password) })
        .eq('id', account.id)
      if (pwError) throw pwError
    }

    await writeActivityLog(session, scope, {
      action: 'update',
      entity: password ? 'user_password' : 'user_account',
      entityId: account.id,
      entityLabel: email,
      metadata: { source: 'member_management', password_changed: Boolean(password), role_preserved: account.role },
    })
    return { changed: true }
  }

  if (!password) return { changed: false }

  const { data: inserted, error: insertError } = await admin
    .from('users')
    .insert({
      name: input.name.trim(),
      email,
      password_hash: await hashPassword(password),
      role: 'pic',
      phone: input.phone?.trim() || null,
      is_active: true,
      organization_id: scope.organizationId,
      chapter_id: scope.chapterId,
    })
    .select('id')
    .single()
  if (insertError) throw insertError

  await writeActivityLog(session, scope, {
    action: 'insert',
    entity: 'user_account',
    entityId: inserted.id,
    entityLabel: email,
    metadata: { source: 'member_management', role: 'pic', password_created: true },
  })
  return { changed: true }
}
