import { useEffect, useState } from 'react'
import { resumeApi } from '../../services/api'
import type { Resume } from '../../types'
import { FileText, Plus, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function ResumeSelector({ selectedId, onSelect }: Props) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    resumeApi.getAll().then((r) => {
      setResumes(r.data)
      if (r.data.length === 1 && !selectedId) onSelect(r.data[0].id)
    })
  }, [])

  const selected = resumes.find((r) => r.id === selectedId)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <FileText size={14} className="inline mr-1" />
        Resume *
      </label>

      {resumes.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500 mb-2">No resumes yet.</p>
          <button
            className="btn-primary text-sm"
            onClick={() => navigate('/resume')}
          >
            <Plus size={14} className="inline mr-1" />
            Add Resume
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="input flex items-center justify-between text-left"
          >
            <span className="truncate">
              {selected
                ? selected.title || selected.originalFilename || `Resume #${selected.id}`
                : 'Select a resume…'}
            </span>
            <ChevronDown size={16} className="shrink-0 text-gray-400" />
          </button>

          {open && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => { onSelect(r.id); setOpen(false) }}
                >
                  <FileText size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{r.title || r.originalFilename || `Resume #${r.id}`}</span>
                  {r.score && (
                    <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      {r.score}/100
                    </span>
                  )}
                </button>
              ))}
              <button
                className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 border-t border-gray-100"
                onClick={() => { setOpen(false); navigate('/resume') }}
              >
                <Plus size={14} />
                Add new resume
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
