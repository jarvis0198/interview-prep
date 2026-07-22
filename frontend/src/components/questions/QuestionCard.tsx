import { useState } from 'react'
import type { Question } from '../../types'
import { ChevronDown, ChevronUp, Copy, Check, CheckCircle2, Circle } from 'lucide-react'
import clsx from 'clsx'

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
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(question.questionText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
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
              <span
                className={clsx(
                  'text-xs font-medium px-2 py-0.5 rounded',
                  difficultyColor[question.difficulty as keyof typeof difficultyColor] ??
                    difficultyColor['N/A'],
                )}
              >
                {question.difficulty}
              </span>
            )}
            <span className="ml-auto text-xs text-gray-300 font-mono">#{index}</span>
          </div>
          <p className={clsx('text-sm leading-relaxed', done ? 'text-gray-400 line-through' : 'text-gray-800')}>
            {question.questionText}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-1"
          title="Copy question"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>

      {question.hint && (
        <div className="pl-8">
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            {showHint ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && (
            <p className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed">
              {question.hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
