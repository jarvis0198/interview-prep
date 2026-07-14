import { useState } from 'react'
import { resumeApi } from '../../services/api'
import type { Resume } from '../../types'

interface Props {
  resume: Resume
  onUpdate: (updated: Resume) => void
}

const TEMPLATES = [
  {
    name: 'classic',
    label: 'Classic',
    description: 'Clean two-column header, bold section headings',
    preview: (
      <div className="text-xs space-y-1 p-2 bg-white border rounded">
        <div className="flex justify-between border-b pb-1">
          <div>
            <div className="font-bold text-gray-800">JOHN DOE</div>
            <div className="text-gray-500">Software Engineer</div>
          </div>
          <div className="text-gray-400 text-right">john@email.com</div>
        </div>
        <div className="font-semibold text-gray-700 uppercase text-xs tracking-wide">Experience</div>
        <div className="h-1 bg-gray-200 rounded" />
        <div className="h-1 bg-gray-200 rounded w-3/4" />
        <div className="font-semibold text-gray-700 uppercase text-xs tracking-wide mt-1">Skills</div>
        <div className="h-1 bg-gray-200 rounded w-1/2" />
      </div>
    ),
  },
  {
    name: 'modern',
    label: 'Modern',
    description: 'Blue accent sidebar, timeline-style layout',
    preview: (
      <div className="text-xs flex gap-1 p-2 bg-white border rounded">
        <div className="w-1 bg-blue-500 rounded self-stretch" />
        <div className="flex-1 space-y-1">
          <div className="font-bold text-blue-700">JOHN DOE</div>
          <div className="text-gray-500 text-xs">Software Engineer</div>
          <div className="text-blue-600 font-semibold text-xs uppercase tracking-wide mt-1">Experience</div>
          <div className="h-1 bg-gray-200 rounded" />
          <div className="h-1 bg-gray-200 rounded w-3/4" />
          <div className="text-blue-600 font-semibold text-xs uppercase tracking-wide mt-1">Skills</div>
          <div className="h-1 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    ),
  },
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Single column, small caps headings, lots of whitespace',
    preview: (
      <div className="text-xs space-y-2 p-2 bg-white border rounded">
        <div className="text-center">
          <div className="font-light text-gray-800 tracking-widest uppercase text-sm">John Doe</div>
          <div className="text-gray-400 text-xs">john@email.com · (555) 123-4567</div>
        </div>
        <hr className="border-gray-200" />
        <div className="text-gray-400 uppercase tracking-widest text-xs">Experience</div>
        <div className="h-1 bg-gray-100 rounded" />
        <div className="h-1 bg-gray-100 rounded w-2/3" />
      </div>
    ),
  },
  {
    name: 'creative',
    label: 'Creative',
    description: 'Bold colored header bar, icon-enhanced contact row',
    preview: (
      <div className="text-xs p-2 bg-white border rounded overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 -mx-2 -mt-2 px-2 py-2 mb-2">
          <div className="font-bold text-white">JOHN DOE</div>
          <div className="text-purple-100 text-xs">Software Engineer</div>
        </div>
        <div className="text-purple-600 font-semibold uppercase text-xs tracking-wide">Experience</div>
        <div className="h-1 bg-gray-200 rounded mt-1" />
        <div className="h-1 bg-gray-200 rounded w-3/4 mt-1" />
      </div>
    ),
  },
  {
    name: 'college',
    label: 'College',
    description: 'NIT-style: logo header, gray section boxes, two-column contact',
    preview: (
      <div className="text-xs p-2 bg-white border rounded overflow-hidden">
        <div className="flex gap-1.5 border-b pb-1.5 mb-1.5">
          <div className="w-6 h-6 bg-gray-200 rounded-sm shrink-0 flex items-center justify-center text-gray-400 text-xs font-bold">N</div>
          <div className="flex-1">
            <div className="font-bold text-gray-800 text-xs">JOHN DOE</div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>CS Engineering</span>
              <span>john@email.com</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>Roll No: 123456</span>
              <span>GitHub · LinkedIn</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-100 px-1 py-0.5 text-xs font-bold text-gray-700 mb-1">EDUCATION</div>
        <div className="h-1 bg-gray-200 rounded mb-0.5" />
        <div className="bg-gray-100 px-1 py-0.5 text-xs font-bold text-gray-700 mb-1">EXPERIENCE</div>
        <div className="h-1 bg-gray-200 rounded w-3/4" />
      </div>
    ),
  },
]

export default function ResumeTemplates({ resume, onUpdate }: Props) {
  // Optimistic local state so the Active badge responds immediately on click
  const [current, setCurrent] = useState(resume.templateName || 'classic')
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Keep local state in sync if parent switches resume
  // (compare by resume.id so switching resumes resets local selection)
  const [lastResumeId, setLastResumeId] = useState(resume.id)
  if (resume.id !== lastResumeId) {
    setLastResumeId(resume.id)
    setCurrent(resume.templateName || 'classic')
  }

  const handleSelect = async (name: string) => {
    if (name === current || saving) return
    setCurrent(name) // optimistic
    setSaving(name)
    setError('')
    try {
      const { data } = await resumeApi.updateTemplate(resume.id, name)
      onUpdate(data)
      setError('')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setCurrent(resume.templateName || 'classic') // rollback
      const msg = status === 401 ? 'Session expired. Please log in again.'
        : status === 404 ? 'Resume not found.'
        : 'Failed to update template. Please try again.'
      setError(msg)
      setTimeout(() => setError(''), 4000)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">Choose Template</h3>
        <p className="text-sm text-gray-500">Select a visual layout for your resume preview and export.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        {TEMPLATES.map((t) => {
          const isActive = current === t.name
          const isSaving = saving === t.name
          return (
            <button
              key={t.name}
              onClick={() => handleSelect(t.name)}
              disabled={!!saving}
              className={`text-left rounded-xl border-2 p-3 transition-all hover:shadow-md ${
                isActive
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              } ${saving && !isSaving ? 'opacity-60' : ''}`}
            >
              <div className="mb-2 pointer-events-none">{t.preview}</div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="font-semibold text-sm text-gray-800">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.description}</div>
                </div>
                {isSaving ? (
                  <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">Saving…</span>
                ) : isActive ? (
                  <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">Active</span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-400">Switch to the Preview tab to see how your resume looks with this template.</p>
    </div>
  )
}
