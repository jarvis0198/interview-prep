import { useState, useRef } from 'react'
import type { Question } from '../../types'
import { ChevronDown, ChevronUp, Copy, Check, CheckCircle2, Circle, Lightbulb, Sparkles, StickyNote, Code2 } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import { questionsApi } from '../../services/api'
import CodeRunner from '../CodeRunner'

const difficultyColor = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700',
  'N/A': 'bg-gray-100 text-gray-500',
}

interface Props {
  question: Question
  index: number
}

export default function QuestionCard({ question, index }: Props) {
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [codePassed, setCodePassed] = useState(false)
  const [solution, setSolution] = useState<string | null>(question.solution ?? null)
  const [notes, setNotes] = useState(question.notes ?? '')
  const [loadingSolution, setLoadingSolution] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(question.questionText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleShowSolution = async () => {
    if (showSolution) { setShowSolution(false); return }
    setShowSolution(true)
    if (solution) return
    setLoadingSolution(true)
    try {
      const res = await questionsApi.getSolution(question.id)
      setSolution(res.data.solution ?? null)
    } catch {
      setSolution('Failed to load solution. Please try again.')
    } finally {
      setLoadingSolution(false)
    }
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    setSavingNotes(true)
    notesTimer.current = setTimeout(async () => {
      try {
        await questionsApi.updateNotes(question.id, value)
      } finally {
        setSavingNotes(false)
      }
    }, 800)
  }

  return (
    <div className={clsx(
      'card space-y-3 transition-all',
      done ? 'opacity-60 bg-gray-50' : 'hover:shadow-md'
    )}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => setDone(!done)}
          className={clsx('shrink-0 mt-0.5 transition-colors', done ? 'text-green-500' : 'text-gray-300 hover:text-gray-400')}
          title={done ? 'Mark as undone' : 'Mark as done'}
        >
          {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {question.category}
            </span>
            {question.difficulty && (
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded',
                difficultyColor[question.difficulty as keyof typeof difficultyColor] ?? difficultyColor['N/A'])}>
                {question.difficulty}
              </span>
            )}
            <span className="ml-auto text-xs text-gray-300 font-mono">#{index}</span>
          </div>
          <p className={clsx('text-sm leading-relaxed', done ? 'text-gray-400 line-through' : 'text-gray-800')}>
            {question.questionText}
          </p>
        </div>
        <button onClick={handleCopy} className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-1" title="Copy question">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="pl-8 flex flex-wrap gap-3">
        {question.hint && (
          <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
            <Lightbulb size={13} />
            {showHint ? 'Hide hint' : 'Show hint'}
            {showHint ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
        <button onClick={handleShowSolution} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
          <Sparkles size={13} />
          {showSolution ? 'Hide solution' : 'Show solution'}
          {showSolution ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={() => setShowNotes(!showNotes)} className={clsx('flex items-center gap-1 text-xs font-medium', notes ? 'text-amber-600 hover:text-amber-800' : 'text-gray-400 hover:text-gray-600')}>
          <StickyNote size={13} />
          {showNotes ? 'Hide notes' : (notes ? 'View notes' : 'Add notes')}
          {showNotes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {question.type === 'OA' && (
          <button onClick={() => setShowCode(!showCode)} className={clsx('flex items-center gap-1 text-xs font-medium', showCode ? 'text-green-700 hover:text-green-900' : 'text-gray-400 hover:text-green-700')}>
            <Code2 size={13} />
            {showCode ? 'Hide code runner' : 'Run code'}
            {showCode ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {showHint && question.hint && (
        <div className="pl-8">
          <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed">{question.hint}</p>
        </div>
      )}

      {showSolution && (
        <div className="pl-8">
          {loadingSolution ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-purple-50 border border-purple-100 rounded-lg p-3">
              <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Generating solution...
            </div>
          ) : (
            <div className="text-xs bg-purple-50 border border-purple-100 rounded-lg p-3 prose prose-sm max-w-none prose-headings:text-purple-800 prose-headings:text-sm prose-code:text-purple-700 prose-code:bg-purple-100 prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>{solution ?? ''}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {showNotes && (
        <div className="pl-8">
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add your notes, approach, or key takeaways..."
              className="w-full text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder-gray-400"
              rows={3}
            />
            {savingNotes && <span className="absolute bottom-2 right-2 text-xs text-gray-400">Saving...</span>}
          </div>
        </div>
      )}

      {question.type === 'OA' && showCode && (
        <div className="pl-0 pt-1">
          <CodeRunner
            questionId={question.id}
            questionText={question.questionText}
            onAllPassed={() => setCodePassed(true)}
          />
          {codePassed && (
            <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 size={15} className="text-green-500 shrink-0" />
              <span className="text-xs text-green-700 font-medium">All test cases passed! Great job.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
