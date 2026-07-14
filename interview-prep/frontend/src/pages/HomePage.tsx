import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ResumeSelector from '../components/resume/ResumeSelector'
import { questionsApi } from '../services/api'
import type { PrepSession } from '../types'
import { Building2, Briefcase, Loader2, ChevronRight, Clock } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentSessions, setRecentSessions] = useState<PrepSession[]>([])

  useEffect(() => {
    questionsApi.getSessions().then((r) => setRecentSessions(r.data.slice(0, 3))).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!selectedResumeId || !company.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await questionsApi.generate({
        resumeId: selectedResumeId,
        companyName: company.trim(),
        targetRole: role.trim() || undefined,
      })
      // Refresh recent sessions after generating
      questionsApi.getSessions().then((r) => setRecentSessions(r.data.slice(0, 3))).catch(() => {})
      navigate(`/questions/${res.data.sessionId}`, { state: res.data })
    } catch (e: any) {
      const msg = e.response?.data?.message
      if (e.response?.status === 503 || msg?.includes('API')) {
        setError('AI service is unavailable. Check that the backend has a valid API key configured.')
      } else {
        setError(msg || 'Failed to generate questions. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Interview Prep</h1>
        <p className="text-gray-500">
          Select your resume, enter the company, and get AI-powered OA + interview questions.
        </p>
      </div>

      <div className="card space-y-5">
        <ResumeSelector
          selectedId={selectedResumeId}
          onSelect={setSelectedResumeId}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Building2 size={14} className="inline mr-1" />
            Company Name *
          </label>
          <input
            className="input"
            placeholder="e.g. Google, Amazon, Atlassian"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Briefcase size={14} className="inline mr-1" />
            Target Role <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            className="input"
            placeholder="e.g. Software Engineer, Backend Developer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <button
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          onClick={handleGenerate}
          disabled={!selectedResumeId || !company.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating questions… this may take 15–30 seconds
            </>
          ) : (
            'Generate Questions'
          )}
        </button>
      </div>

      {recentSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Clock size={14} />
              Recent Sessions
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-primary-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/questions/${s.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-primary-200 hover:shadow-sm transition-all text-left group"
              >
                <Building2 size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-700 text-sm">{s.companyName}</span>
                  {s.targetRole && (
                    <span className="text-gray-400 text-sm"> · {s.targetRole}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
