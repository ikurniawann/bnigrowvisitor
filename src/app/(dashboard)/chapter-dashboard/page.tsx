'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from '@/components/pages/Dashboard'
import { getChapterRoute } from '@/lib/chapterRoute'

export default function ChapterDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(getChapterRoute('dashboard'))
  }, [router])

  return <Dashboard mode="chapter" />
}
