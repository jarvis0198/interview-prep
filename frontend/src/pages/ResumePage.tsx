import { useState, useEffect } from 'react'
import { resumeApi } from '../services/api'
import type { Resume } from '../types'
import ResumeUploader from '../components/resume/ResumeUploader'
import ResumeEditor from '../components/resume/ResumeEditor'
import ResumeScorer from '../components/resume/ResumeScorer'
import ResumeTemplates from '../components/resume/ResumeTemplates'
import TemplatePreview from '../components/resume/TemplatePreview'
import AISuggestions from '../components/resume/AISuggestions'
import BuildResumeModal from '../components/resume/BuildResumeModal'
import { Trash2, Plus, FileText, Wand2, Pencil, Check, X } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'edit' | 'preview' | 'templates' | 'suggestions' | 'score'

const TABS: { key: Tab; label: string }[] = [
  { key: 'edit', label: 'Edit' },
  { key: 'preview', label: 'Preview' },
  { key: 'templates', label: 'Templates' },
  { key: 'suggestions', label: 'AI Suggestions' },
  { key: 'score', label: 'Score' },
]

function resumeDisplayName(r: Resume) {
  return r.title || r.originalFilename || `Resume #${r.id}`
}

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showBuild, setShowBuild] = useState(false)
  const [tab, setTab] = useState<Tab>('edit')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  useEffect(() => {
    resumeApi.getAll().then((r) => {
      setResumes(r.data)
      if (r.data.length > 0) setActiveId(r.data[0].id)
    })
  }, [])

  const active = resumes.find((r) => r.id === activeId)

  const updateInList = (updated: Resume) =>
    setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))

  const handleUploaded = (r: Resume) => {
    setResumes((prev) => [r, ...prev])
    setActiveId(r.id)
    setShowUpload(false)
    setTab('edit')
  }

  const handleBuilt = (r: Resume) => {
    setResumes((prev) => [r, ...prev])
    setActiveId(r.id)
    setTab('preview')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resume?')) return
    await resumeApi.delete(id)
    const next = resumes.filter((r) => r.id !== id)
    setResumes(next)
    setActiveId(next[0]?.id ?? null)
  }

  const handleApplySuggestions = (suggestions: string) => {
    if (!active) return
    const newContent = active.content + suggestions
    resumeApi.update(active.id, newContent).then(({ data }) => {
      updateInList(data)
      setTab('edit')
    })
  }

  const startEditTitle = () => {
    if (!active) return
    setTitleDraft(active.title || active.originalFilename || '')
    setEditingTitle(true)
  }

  const saveTitle = async () => {
    if (!active) return
    try {
      const res = await resumeApi.updateTitle(active.id, titleDraft)
      updateInList(res.data)
    } catch {
      // silently ignore — title is non-critical
    }
    setEditingTitle(false)
  }

  const cancelEditTitle = () => setEditingTitle(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Resumes</h1>
        <div className="flex gap-2">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => setShowBuild(true)}
          >
            <Wand2 size={16} />
            Build with AI
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Plus size={16} />
            Add Resume
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="card">
          <h2 className="text-base font-semibold mb-4">Upload or Paste Resume</h2>
          <ResumeUploader onUploaded={handleUploaded} />
        </div>
      )}

      {resumes.length === 0 && !showUpload && (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium mb-1">No resumes yet</p>
          <p className="text-gray-400 text-sm mb-6">Upload a file, paste text, or build one with AI</p>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary" onClick={() => setShowUpload(true)}>
              Upload Resume
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowBuild(true)}>
              <Wand2 size={14} />
              Build with AI
            </button>
          </div>
        </div>
      )}

      {resumes.length > 0 && (
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 shrink-0 space-y-1">
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => { setActiveId(r.id); setEditingTitle(false) }}
                className={clsx(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-start gap-2',
                  r.id === activeId
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <FileText size={14} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate">{resumeDisplayName(r)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {r.score != null && (
                      <span className="text-xs text-green-600 font-medium">{r.score}/100</span>
                    )}
                    {r.templateName && r.templateName !== 'classic' && (
                      <span className="text-xs text-gray-400 capitalize">{r.templateName}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Main panel — keyed by resume id so switching resumes resets child state */}
          {active && (
            <div key={active.id} className="flex-1 card space-y-5 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  {editingTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        className="input py-1 text-sm flex-1"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') cancelEditTitle() }}
                        placeholder="Resume name…"
                        maxLength={100}
                      />
                      <button onClick={saveTitle} className="text-green-600 hover:text-green-700 p-1">
                        <Check size={15} />
                      </button>
                      <button onClick={cancelEditTitle} className="text-gray-400 hover:text-gray-600 p-1">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-semibold text-gray-800 truncate">
                        {resumeDisplayName(active)}
                      </h2>
                      <button
                        onClick={startEditTitle}
                        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      {active.score != null && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          {active.score}/100
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!editingTitle && (
                  <button
                    onClick={() => handleDelete(active.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={clsx(
                      'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                      tab === t.key
                        ? 'border-primary-600 text-primary-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content — all mounted, hidden via CSS to preserve state */}
              <div className={tab === 'edit' ? '' : 'hidden'}>
                <ResumeEditor
                  resume={active}
                  onSaved={updateInList}
                />
              </div>
              <div className={tab === 'preview' ? '' : 'hidden'}>
                <TemplatePreview resume={active} />
              </div>
              <div className={tab === 'templates' ? '' : 'hidden'}>
                <ResumeTemplates
                  resume={active}
                  onUpdate={(updated) => {
                    updateInList(updated)
                  }}
                />
              </div>
              <div className={tab === 'suggestions' ? '' : 'hidden'}>
                <AISuggestions
                  resumeId={active.id}
                  onApply={handleApplySuggestions}
                />
              </div>
              <div className={tab === 'score' ? '' : 'hidden'}>
                <ResumeScorer
                  resume={active}
                  onScored={updateInList}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {showBuild && (
        <BuildResumeModal
          onClose={() => setShowBuild(false)}
          onCreated={handleBuilt}
        />
      )}
    </div>
  )
}
