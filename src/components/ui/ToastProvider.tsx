'use client'

import { useEffect, useState } from 'react'
import type { ToastPayload, ToastVariant } from '@/lib/ui/toast'

interface ToastState extends ToastPayload {
  id: number
  variant: ToastVariant
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-200/70 bg-emerald-50/85 text-emerald-950',
  error: 'border-red-200/70 bg-red-50/85 text-red-950',
  info: 'border-sky-200/70 bg-sky-50/85 text-sky-950',
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail
      const id = Date.now()
      const toast: ToastState = {
        id,
        title: detail.title,
        description: detail.description,
        variant: detail.variant || 'success',
      }

      setToasts(prev => [...prev, toast].slice(-3))
      window.setTimeout(() => {
        setToasts(prev => prev.filter(item => item.id !== id))
      }, 3600)
    }

    window.addEventListener('app-toast', handleToast)
    return () => window.removeEventListener('app-toast', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`glass-toast ${variantStyles[toast.variant]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm">
            <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-[-0.01em]">{toast.title}</div>
            {toast.description && (
              <div className="mt-0.5 text-xs text-slate-600">{toast.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
