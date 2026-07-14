import { useState, useEffect } from 'react'
import { resumeApi } from '../../services/api'
import type { Resume } from '../../types'
import { Save, Loader2, Edit3 } from 'lucide-react'

interface Props {
  resume: Resume
  onSaved: (updated: Resume) => void
}

export default function ResumeEditor({ resume, onSaved }: Props) {
  const [content, setContent] = useState(resume.content)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Sync content when switching resumes
  useEffect(() => {
    setContent(resume.content)
    setSaved(false)
  }, [resume.id])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await resumeApi.update(resume.id, content)
      onSaved(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = content !== resume.content

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
          <Edit3 size={14} /> Edit Resume
        </h3>
        <button
          className="btn-primary text-sm flex items-center gap-1.5 py-1.5"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            '✓ Saved'
          ) : (
            <><Save size={14} /> Save Changes</>
          )}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <textarea
        className="input min-h-[380px] resize-y font-mono text-xs leading-relaxed"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <p className="text-xs text-gray-400">{content.length} characters</p>
    </div>
  )
}
