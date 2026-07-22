import { useState } from 'react'
import { resumeApi } from '../../services/api'
import type { Resume, ResumeScoreResponse } from '../../types'
import { Star, Loader2, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  resume: Resume
  onScored: (updated: Resume) => void
}

const scoreColor = (s: number) =>
  s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'

const scoreBg = (s: number) =>
  s >= 80 ? 'bg-green-50 border-green-200' : s >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

const scoreLabel = (s: number) =>
  s >= 80 ? 'Strong' : s >= 60 ? 'Good' : 'Needs Work'

export default function ResumeScorer({ resume, onScored }: Props) {
  const [result, setResult] = useState<ResumeScoreResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleScore = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await resumeApi.score(resume.id)
      setResult(res.data)
      onScored({ ...resume, score: res.data.score, scoreFeedback: res.data.feedback })
    } catch {
      setError('Failed to score resume. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const display = result ?? (
    resume.score != null
      ? { score: resume.score, feedback: resume.scoreFeedback ?? '', strengths: [], improvements: [] }
      : null
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleScore}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
          ) : display ? (
            <><RefreshCw size={16} /> Re-score</>
          ) : (
            <><Star size={16} /> Score My Resume</>
          )}
        </button>
        {display && (
          <span className={clsx('text-sm font-medium', scoreColor(display.score))}>
            Last score: {display.score}/100 — {scoreLabel(display.score)}
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {display && (
        <div className="space-y-4">
          <div className={clsx('border rounded-xl p-5 flex items-center gap-5', scoreBg(display.score))}>
            <div className="text-center shrink-0">
              <div className={clsx('text-5xl font-bold', scoreColor(display.score))}>
                {display.score}
              </div>
              <div className={clsx('text-xs font-semibold mt-1', scoreColor(display.score))}>
                / 100
              </div>
            </div>
            <div>
              <p className={clsx('text-sm font-bold', scoreColor(display.score))}>
                {scoreLabel(display.score)}
              </p>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{display.feedback}</p>
            </div>
          </div>

          {display.strengths.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                  <CheckCircle size={14} /> Strengths
                </h4>
                <ul className="space-y-1.5">
                  {display.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2 items-start">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-orange-700 flex items-center gap-1.5">
                  <TrendingUp size={14} /> To Improve
                </h4>
                <ul className="space-y-1.5">
                  {display.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2 items-start">
                      <span className="text-orange-500 mt-0.5 shrink-0">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
