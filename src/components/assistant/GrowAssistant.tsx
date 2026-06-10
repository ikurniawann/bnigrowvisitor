'use client'

import { useEffect, useRef, useState } from 'react'

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const starterPrompts = [
  'Ringkas kondisi visitor minggu ini',
  'Siapa top visitor brought?',
  'Data apa yang perlu dilengkapi?',
]

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getStoredUserId() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return ''
    const user = JSON.parse(raw)
    return typeof user?.id === 'string' ? user.id : ''
  } catch {
    return ''
  }
}

function normalizeAssistantText(value: string) {
  return value
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function GrowAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Halo, saya Grow Assistant. Saya bisa bantu baca data visitor, status follow-up, PIC, meeting, top referral, dan insight dashboard BNI Grow.',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isOpen])

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isSending) return

    const userMessage: AssistantMessage = {
      id: createId(),
      role: 'user',
      content,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setIsOpen(true)
    setIsSending(true)

    try {
      const response = await fetch('/api/grow-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: getStoredUserId(),
          messages: nextMessages.map(message => ({
            role: message.role,
            content: message.role === 'user'
              ? `${message.content}\n\nJawab natural tanpa markdown, tanpa tanda **, tanpa menyebut sumber, dan akhiri dengan pertanyaan singkat apa lagi yang bisa dibantu.`
              : message.content,
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Grow Assistant belum bisa menjawab.')
      }

      setIsOnline(true)
      setMessages(prev => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          content: normalizeAssistantText(data.answer || 'Saya belum menemukan jawaban yang pas dari data dashboard. Ada lagi yang bisa saya bantu?'),
        },
      ])
    } catch (error: any) {
      setIsOnline(false)
      setMessages(prev => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          content: normalizeAssistantText(error.message || 'Maaf, Grow Assistant sedang offline atau bermasalah. Coba lagi sebentar.'),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[2147482000]">
      {isOpen && (
        <div className="mb-4 flex h-[min(640px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white shadow-lg shadow-red-900/20">
                GA
              </div>
              <div>
                <div className="text-sm font-bold text-gray-950">Grow Assistant</div>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${isOnline === false ? 'text-gray-500' : 'text-emerald-600'}`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline === false ? 'bg-gray-400' : 'bg-emerald-500'}`} />
                  {isOnline === false ? 'Offline' : 'Online'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Tutup Grow Assistant"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white px-4 py-4">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/10'
                      : 'border border-gray-100 bg-white text-gray-800 shadow-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                  Grow Assistant sedang membaca data...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {starterPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isSending}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                sendMessage()
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                rows={1}
                placeholder="Tanya Grow Assistant..."
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:border-red-300 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Kirim pesan"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="group flex h-16 items-center gap-3 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-red-900 px-4 pr-5 text-white shadow-[0_18px_50px_rgba(185,28,28,0.35)] ring-1 ring-white/20 transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(185,28,28,0.42)]"
        aria-label="Buka Grow Assistant"
      >
        {isOpen ? (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <>
            <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.16] text-sm font-black shadow-inner ring-1 ring-white/25">
              GA
              <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-red-700 ${isOnline === false ? 'bg-gray-300' : 'bg-emerald-300'}`} />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-black tracking-wide">Grow Assistant</span>
              <span className="block text-[11px] font-semibold text-white/75">Tanya data visitor</span>
            </span>
          </>
        )}
      </button>
    </div>
  )
}
