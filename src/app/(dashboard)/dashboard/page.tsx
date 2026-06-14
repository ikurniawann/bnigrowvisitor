'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/pages/Dashboard'
import { getChapterRoute } from '@/lib/chapterRoute'
import { isNationalAdmin } from '@/lib/permissions'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      const user = storedUser ? JSON.parse(storedUser) : null
      router.replace(isNationalAdmin(user) ? '/national-overview' : getChapterRoute('dashboard', user))
    } catch {
      router.replace('/chapter-dashboard')
    }
  }, [router])

  return <Dashboard mode="chapter" />
}
