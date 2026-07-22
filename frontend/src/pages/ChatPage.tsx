import { useState, useEffect, useRef } from 'react'
import { chatApi, resumeApi } from '../services/api'
import type { Resume } from '../types'
import { Send, Bot, User, Loader2, MessageSquare, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'What are my strongest technical skills?',
  'What are my weaknesses for a backend engineer role?',
  'What gaps should I address before applying to Google?',
  'How would you describe my experience level?',
  'Which projects are most impressive on my resume?',
  'What soft skills are evident from my resume?',
]

export default function ChatPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Persist messages per resume across navigations
  const historyRef = useRef<Record<number, Message[]>>({})
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    resumeApi.getAll().then((r) => {
      setResumes(r.data)
      if (r.data.length > 0) setSelectedId(r.data[0].id)
    })
  }, [])

  // Restore messages when selected resume changes
  useEffect(() => {
    if (selectedId == null) return
    setMessages(historyRef.current[selectedId] ?? [])
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const updateMessages = (updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const next = updater(prev)
      if (selectedId != null) historyRef.current[selectedId] = next
      return next
    })
  }

  const send = async (text?: string) => {
    const question = (text ?? input).trim()
    if (!question || loading) return

    updateMessages((m) => [...m, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await chatApi.send(selectedId, question)
      updateMessages((m) => [...m, { role: 'assistant', text: res.data.answer }])
    } catch {
      updateMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const selected = resumes.find((r) => r.id === selectedId)

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare size={22} className="text-primary-600" />
          Chat with Resume
        </h1>
        {resumes.length > 0 && (
          <div className="relative">
            <select
              className="input pr-8 text-sm appearance-none cursor-pointer"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || r.originalFilename || `Resume #${r.id}`}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="card bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
              <div className="flex items-start gap-3">
                <Bot size={20} className="text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary-800 mb-1">
                    Resume-aware AI assistant
                  </p>
                  <p className="text-sm text-gray-600">
                    Ask me anything about{' '}
                    <span className="font-medium">
                      {selected?.title || selected?.originalFilename || 'your resume'}
                    </span>
                    . I use RAG to search your resume content and give grounded, specific answers.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested questions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary-700" />
              </div>
            )}
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm',
              )}
            >
              {m.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-primary-700" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-primary-500" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask about your resume…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button
          className="btn-primary px-4 flex items-center gap-1.5"
          onClick={() => send()}
          disabled={!input.trim() || loading}
        >
          <Send size={16} />
          Send
        </button>
      </div>
    </div>
  )
}
