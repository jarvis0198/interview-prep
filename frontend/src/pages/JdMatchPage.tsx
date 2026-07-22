import { useState, useEffect } from 'react'
import { resumeApi } from '../services/api'
import type { Resume, JdMatchResponse } from '../types'
import { FileSearch, CheckCircle2, XCircle, Lightbulb, ChevronRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'

function ScoreRing({ score }: { score: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute" style={{ marginTop: 28 }}>
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  )
}

export default function JdMatchPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<JdMatchResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    resumeApi.getAll().then((r) => {
      setResumes(r.data)
      if (r.data.length > 0) setSelectedResumeId(r.data[0].id)
    })
  }, [])

  const handleMatch = async () => {
    if (!selectedResumeId || !jd.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await resumeApi.matchJd(selectedResumeId, jd)
      setResult(res.data)
    } catch {
      setError('Failed to analyze. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const scoreLabel = (score: number) =>
    score >= 80 ? 'Excellent match' : score >= 60 ? 'Good match' : score >= 40 ? 'Partial match' : 'Weak match'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FileSearch size={24} />
        JD Matcher
      </h1>
      <p className="text-sm text-gray-500">Paste a job description to see how well your resume matches and what's missing.</p>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Resume</label>
          <select
            value={selectedResumeId ?? ''}
            onChange={(e) => setSelectedResumeId(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.title || r.originalFilename || `Resume #${r.id}`}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            rows={8}
          />
        </div>

        <button
          onClick={handleMatch}
          disabled={loading || !jd.trim() || !selectedResumeId}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><FileSearch size={16} /> Analyze Match</>}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="card flex items-center gap-6">
            <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
              <ScoreRing score={result.score} />
            </div>
            <div>
              <p className={clsx('text-lg font-bold',
                result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-yellow-600' : result.score >= 40 ? 'text-orange-600' : 'text-red-600'
              )}>{scoreLabel(result.score)}</p>
              <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                <CheckCircle2 size={16} className="text-green-500" /> Matched Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.length === 0 ? <p className="text-xs text-gray-400">None found</p> :
                  result.matchedSkills.map((s) => (
                    <span key={s} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
              </div>
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                <XCircle size={16} className="text-red-400" /> Missing Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.length === 0 ? <p className="text-xs text-gray-400">None — great match!</p> :
                  result.missingSkills.map((s) => (
                    <span key={s} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
              </div>
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                <Lightbulb size={16} className="text-amber-500" /> Suggestions to Improve Your Match
              </h3>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <ChevronRight size={15} className="text-primary-400 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
