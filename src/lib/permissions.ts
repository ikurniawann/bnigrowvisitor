import { User } from './supabase'

export const NATIONAL_ADMIN_EMAIL = 'admin@bniindonesia.com'

export function isNationalAdmin(user?: Pick<User, 'email' | 'role'> | null) {
  if (!user) return false
  return (
    user.role === 'national_admin' ||
    user.role === 'admin' ||
    user.email?.toLowerCase() === NATIONAL_ADMIN_EMAIL
  )
}

export function isChapterAdmin(user?: Pick<User, 'role'> | null) {
  return user?.role === 'chapter_admin'
}

export function isChapterUser(user?: Pick<User, 'role'> | null) {
  return user?.role === 'chapter_admin' || user?.role === 'pic' || user?.role === 'member'
}

export function canManageMasterData(user?: Pick<User, 'email' | 'role'> | null) {
  return isNationalAdmin(user)
}

export function canManageChapterData(user?: Pick<User, 'email' | 'role'> | null) {
  return isNationalAdmin(user) || isChapterAdmin(user) || user?.role === 'pic'
}

export function getUserLevelLabel(user?: Pick<User, 'email' | 'role'> | null) {
  if (isNationalAdmin(user)) return 'National Admin'
  if (user?.role === 'chapter_admin') return 'Chapter Admin'
  if (user?.role === 'pic') return 'PIC'
  if (user?.role === 'member') return 'Member'
  return 'User'
}
