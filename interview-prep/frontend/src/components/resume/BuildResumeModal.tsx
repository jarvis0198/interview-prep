import { useState } from 'react'
import { X, FileText, Code, List, Search, Link } from 'lucide-react'
import { resumeApi } from '../../services/api'
import type { Resume } from '../../types'

type Mode = 'text' | 'json' | 'keyvalue' | 'regex' | 'url'

interface Props {
  onClose: () => void
  onCreated: (resume: Resume) => void
}

const TABS: { mode: Mode; label: string; icon: React.ReactNode }[] = [
  { mode: 'text', label: 'Plain Text', icon: <FileText size={14} /> },
  { mode: 'json', label: 'JSON', icon: <Code size={14} /> },
  { mode: 'keyvalue', label: 'Key-Value', icon: <List size={14} /> },
  { mode: 'regex', label: 'Regex Extract', icon: <Search size={14} /> },
  { mode: 'url', label: 'URL', icon: <Link size={14} /> },
]

const PLACEHOLDERS: Record<Mode, string> = {
  text: `I'm a software engineer with 3 years of experience at Google working on distributed systems. I graduated from MIT with a BS in Computer Science in 2021. My skills include Python, Go, Kubernetes, and PostgreSQL. I led a project that reduced API latency by 40%...`,
  json: `{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "(555) 123-4567",
  "title": "Software Engineer",
  "summary": "Passionate engineer with 4 years experience in backend development.",
  "experience": [
    {
      "company": "TechCorp",
      "role": "Senior SWE",
      "duration": "2022-present",
      "highlights": ["Built microservices architecture", "Mentored 3 junior engineers"]
    }
  ],
  "education": [{"degree": "BS Computer Science", "school": "Stanford", "year": 2020}],
  "skills": ["Java", "Python", "AWS", "Docker", "PostgreSQL"]
}`,
  keyvalue: `name: Jane Smith | email: jane@example.com | phone: (555) 123-4567
title: Software Engineer | location: San Francisco, CA
experience: 4 years at TechCorp as Senior SWE — built microservices, reduced latency by 40%
education: BS Computer Science, Stanford University, 2020
skills: Java, Python, AWS, Docker, Kubernetes, PostgreSQL
projects: Open source contributor to Apache Kafka | Built a real-time chat app with 10k users`,
  regex: `Paste any document here — an old resume, a LinkedIn export, a bio, emails, or any raw text.

The AI will automatically extract emails, phone numbers, dates, company names, job titles,
universities, degrees, and skills, then structure them into a professional resume.

Example — just paste something like:
Jane Smith - jane.smith@email.com - 555-123-4567
Currently at Amazon (2021-present), previously at Microsoft (2018-2021)
Stanford BS CS 2018. Expert in Java and Kubernetes.`,
  url: '',
}

const HELP_TEXT: Record<Mode, string> = {
  text: 'Describe yourself in plain English — like you would to a friend. The AI will turn it into a structured resume.',
  json: 'Paste a JSON object with your resume data. Any structure is fine — the AI will interpret it.',
  keyvalue: 'Use key: value pairs separated by | or new lines. Any format works.',
  regex: 'Paste any raw text. The AI will extract relevant info and build a resume from it.',
  url: 'Enter a LinkedIn profile URL, GitHub profile URL, or personal portfolio URL.',
}

export default function BuildResumeModal({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>('text')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBuild = async () => {
    if (!input.trim()) {
      setError('Please enter some content first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await resumeApi.build(mode, input)
      onCreated(data)
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to build resume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Build Resume with AI</h2>
            <p className="text-sm text-gray-500">Generate a professional resume from any source</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b px-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.mode}
              onClick={() => { setMode(tab.mode); setInput('') }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                mode === tab.mode
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{HELP_TEXT[mode]}</p>

          {mode === 'url' ? (
            <input
              type="url"
              placeholder="https://linkedin.com/in/yourprofile or https://github.com/yourusername"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input w-full"
            />
          ) : (
            <textarea
              rows={12}
              placeholder={PLACEHOLDERS[mode]}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`input w-full resize-none text-sm leading-relaxed ${
                mode === 'json' ? 'font-mono text-xs' : ''
              }`}
            />
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleBuild} className="btn-primary min-w-[140px]" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Building...
              </span>
            ) : (
              'Build Resume'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
