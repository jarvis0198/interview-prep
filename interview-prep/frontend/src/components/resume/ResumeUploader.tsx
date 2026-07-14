import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { resumeApi } from '../../services/api'
import type { Resume } from '../../types'
import { Upload, FileText, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  onUploaded: (resume: Resume) => void
}

export default function ResumeUploader({ onUploaded }: Props) {
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setLoading(true)
      setError('')
      try {
        const res = await resumeApi.upload(file)
        onUploaded(res.data)
      } catch {
        setError('Upload failed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [onUploaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  })

  const handleTextSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await resumeApi.uploadText(text)
      onUploaded(res.data)
    } catch {
      setError('Failed to save resume text.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={clsx('px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
            mode === 'file' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100')}
          onClick={() => setMode('file')}
        >
          Upload File
        </button>
        <button
          className={clsx('px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
            mode === 'text' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100')}
          onClick={() => setMode('text')}
        >
          Paste Text
        </button>
      </div>

      {mode === 'file' ? (
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400',
          )}
        >
          <input {...getInputProps()} />
          {loading ? (
            <Loader2 size={32} className="mx-auto text-primary-500 animate-spin" />
          ) : (
            <>
              <Upload size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT · max 10MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            className="input min-h-[200px] resize-y font-mono text-xs"
            placeholder="Paste your resume text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleTextSubmit}
            disabled={!text.trim() || loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Save Resume
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
