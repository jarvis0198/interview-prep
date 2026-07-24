import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { questionsApi } from '../services/api'
import type { Question } from '../types'
import { Mic, ChevronRight, ChevronLeft, CheckCircle2, Loader2, Timer, Trophy } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import CodeRunner from '../components/CodeRunner'

const TIMER_SECONDS = 120

export default function MockInterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [timerActive, setTimerActive] = useState(false)
  const [answers, setAnswers] = useState<Record<number, { answer: string; feedback: string }>>({})
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!sessionId) return
    questionsApi.getBySession(Number(sessionId))
      .then((res) => { setQuestions(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    } else if (timeLeft === 0) {
      setTimerActive(false)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive, timeLeft])

  const startTimer = () => {
    setTimeLeft(TIMER_SECONDS)
    setTimerActive(true)
  }

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setTimerActive(false)
    setLoadingFeedback(true)
    try {
      const q = questions[current]
      const res = await questionsApi.getFeedback(q.id, answer)
      const fb = res.data.feedback
      setFeedback(fb)
      setAnswers((prev) => ({ ...prev, [current]: { answer, feedback: fb } }))
    } catch {
      setFeedback('Failed to get feedback. Please try again.')
    } finally {
      setLoadingFeedback(false)
    }
  }

  const handleNext = () => {
    if (current >= questions.length - 1) {
      setDone(true)
      return
    }
    setCurrent((c) => c + 1)
    setAnswer(answers[current + 1]?.answer ?? '')
    setFeedback(answers[current + 1]?.feedback ?? null)
    setTimeLeft(TIMER_SECONDS)
    setTimerActive(false)
  }

  const handlePrev = () => {
    if (current === 0) return
    setCurrent((c) => c - 1)
    setAnswer(answers[current - 1]?.answer ?? '')
    setFeedback(answers[current - 1]?.feedback ?? null)
    setTimeLeft(TIMER_SECONDS)
    setTimerActive(false)
  }

  const timerColor = timeLeft > 60 ? 'text-green-600' : timeLeft > 30 ? 'text-yellow-600' : 'text-red-600'
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  const answeredCount = Object.keys(answers).length

  if (loading) return <div className="text-center py-20 text-gray-400">Loading questions...</div>
  if (questions.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <p>No questions in this session.</p>
      <button onClick={() => navigate('/history')} className="btn-primary mt-4">Back to History</button>
    </div>
  )

  if (done) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card text-center py-12 space-y-4">
        <Trophy size={48} className="text-yellow-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-800">Mock Interview Complete!</h2>
        <p className="text-gray-500">{answeredCount} of {questions.length} questions answered</p>
        <div className="flex justify-center gap-3 mt-4">
          <button onClick={() => { setCurrent(0); setDone(false); setFeedback(null); setAnswer(answers[0]?.answer ?? '') }} className="btn-secondary">Review Answers</button>
          <button onClick={() => navigate('/history')} className="btn-primary">Back to History</button>
        </div>
      </div>
    </div>
  )

  const q = questions[current]
  const isOA = q.type === 'OA' || q.category === 'DSA'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/history')} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Mic size={20} /> Mock Interview
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{current + 1} / {questions.length}</span>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={clsx('w-2 h-2 rounded-full', answers[i] ? 'bg-green-400' : i === current ? 'bg-primary-500' : 'bg-gray-200')} />
            ))}
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.category}</span>
              {q.difficulty && <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">{q.difficulty}</span>}
              {isOA && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">DSA / Coding</span>}
            </div>
            <p className="text-base font-medium text-gray-800 leading-relaxed">{q.questionText}</p>
          </div>
          {!isOA && (
            <div className="shrink-0 text-right">
              <div className={clsx('text-lg font-mono font-bold', timerColor)}>{mins}:{secs}</div>
              {!timerActive && !feedback && (
                <button onClick={startTimer} className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-1">
                  <Timer size={12} /> Start timer
                </button>
              )}
            </div>
          )}
        </div>

        {!isOA && (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={!!feedback}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none disabled:bg-gray-50 disabled:text-gray-500"
            rows={6}
          />
        )}

        {!isOA && !feedback && (
          <button onClick={handleSubmit} disabled={!answer.trim() || loadingFeedback}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {loadingFeedback ? <><Loader2 size={15} className="animate-spin" /> Getting feedback...</> : <><CheckCircle2 size={15} /> Submit Answer</>}
          </button>
        )}
      </div>

      {/* DSA: always-open code runner */}
      {isOA && (
        <CodeRunner
          questionId={q.id}
          questionText={q.questionText}
          hideTestCases
        />
      )}

      {!isOA && feedback && (
        <div className="card space-y-2">
          <h3 className="font-semibold text-gray-700 text-sm">AI Feedback</h3>
          <div className="prose prose-sm max-w-none text-xs prose-headings:text-gray-700 prose-headings:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={handlePrev} disabled={current === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={16} /> Previous
        </button>
        <button onClick={handleNext}
          className="flex items-center gap-1 btn-primary">
          {current === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
