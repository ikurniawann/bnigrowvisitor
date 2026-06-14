'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNationalAdmin } from '@/lib/permissions'
import { getChapterRoute } from '@/lib/chapterRoute'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const parsedUser = JSON.parse(user)
      router.push(isNationalAdmin(parsedUser) ? '/national-dashboard' : getChapterRoute('dashboard', parsedUser))
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  )
}
