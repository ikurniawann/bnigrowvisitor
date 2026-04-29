'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      
      if (result.success && result.user) {
        localStorage.setItem('user', JSON.stringify(result.user))
        router.push('/dashboard')
      } else {
        setError(result.error || 'Login gagal. Silakan coba lagi.')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-gray-50 to-red-100">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img 
              src="https://bnijakartabarat.com/jakarta-barat-grow/en-ID/assets/images/logo BNI Grow.0c9a0f371e56.png" 
              alt="BNI Grow Logo"
              className="h-20 w-auto mx-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Visitor Management System</h1>
          <p className="text-gray-600 mt-1">BNI Grow Jakarta</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Login</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500"
                placeholder="admin@bnigrow.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 font-medium placeholder-gray-500"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 transform hover:-translate-y-0.5"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Powered by{' '}
            <a 
              href="https://wit.id" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 font-medium underline transition-colors"
            >
              WIT.ID
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
