import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import type { GenerateQuestionsResponse } from '../types'
import { questionsApi } from '../services/api'
import QuestionCard from '../components/questions/QuestionCard'
import { Monitor, MessageSquare, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { QuestionSkeleton } from '../components/Skeleton'

function cacheKey(sessionId: string) {
  return `questions_session_${sessionId}`
}

export default function QuestionsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'oa' | 'interview'>('oa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<GenerateQuestionsResponse | null>(null)

  useEffect(() => {
    if (!sessionId) { setError('Invalid session.'); return }
    const id = Number(sessionId)
    if (isNaN(id)) { setError('Invalid session.'); return }

    // 1. Prefer fresh data passed via navigation state (just generated)
    const navState = location.state as GenerateQuestionsResponse | null
    if (navState?.oaQuestions) {
      setData(navState)
      sessionStorage.setItem(cacheKey(sessionId), JSON.stringify(navState))
      return
    }

    // 2. Try sessionStorage cache (survives nav-tab switching within same browser tab)
    const cached = sessionStorage.getItem(cacheKey(sessionId))
    if (cached) {
      try {
        setData(JSON.parse(cached))
        return
      } catch {
        sessionStorage.removeItem(cacheKey(sessionId))
      }
    }

    // 3. Fetch from API
    setLoading(true)
    questionsApi
      .getBySession(id)
      .then((res) => {
        const oa = res.data.filter((q) => q.type === 'OA')
        const interview = res.data.filter((q) => q.type === 'INTERVIEW')
        const result: GenerateQuestionsResponse = {
          sessionId: Number(sessionId),
          oaQuestions: oa,
          interviewQuestions: interview,
        }
        setData(result)
        sessionStorage.setItem(cacheKey(sessionId), JSON.stringify(result))
      })
      .catch(() => setError('Failed to load questions.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="h-8 w-56 bg-gray-200 rounded-lg animate-pulse" />
        <QuestionSkeleton />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>
  }

  if (!data) return null

  const questions = tab === 'oa' ? data.oaQuestions : data.interviewQuestions

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/history')}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Generated Questions</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab('oa')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors',
            tab === 'oa'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300',
          )}
        >
          <Monitor size={16} />
          Online Assessment
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded-full',
            tab === 'oa' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
          )}>
            {data.oaQuestions.length}
          </span>
        </button>
        <button
          onClick={() => setTab('interview')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors',
            tab === 'interview'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300',
          )}
        >
          <MessageSquare size={16} />
          Interview
          <span className={clsx(
            'text-xs px-1.5 py-0.5 rounded-full',
            tab === 'interview' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
          )}>
            {data.interviewQuestions.length}
          </span>
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No questions in this section.</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard key={q.id ?? i} question={q} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
