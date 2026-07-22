import { useState, useEffect, useCallback } from 'react'
import { STUDY_GUIDE, type Subtopic, type Topic } from '../data/studyGuide'
import { studyApi } from '../services/api'
import { Layers, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, ExternalLink, Shuffle } from 'lucide-react'
import clsx from 'clsx'

interface Card {
  subtopic: Subtopic
  topic: Topic
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const difficultyColor = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700',
}

type FilterMode = 'all' | 'todo' | 'done'

export default function FlashcardsPage() {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all')
  const [deck, setDeck] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionDone, setSessionDone] = useState<Set<string>>(new Set())
  const [started, setStarted] = useState(false)

  useEffect(() => {
    studyApi.getProgress()
      .then(r => setDone(new Set(r.data)))
      .catch(() => {})
  }, [])

  const buildDeck = useCallback(() => {
    const allCards: Card[] = STUDY_GUIDE.flatMap(topic =>
      topic.subtopics.map(subtopic => ({ subtopic, topic }))
    )
    const filtered = allCards.filter(c => {
      if (selectedTopicId !== 'all' && c.topic.id !== selectedTopicId) return false
      if (filterMode === 'todo') return !done.has(c.subtopic.id)
      if (filterMode === 'done') return done.has(c.subtopic.id)
      return true
    })
    return shuffle(filtered)
  }, [selectedTopicId, filterMode, done])

  const startSession = () => {
    const d = buildDeck()
    setDeck(d)
    setIndex(0)
    setFlipped(false)
    setSessionDone(new Set())
    setStarted(true)
  }

  const markDone = async () => {
    const card = deck[index]
    if (!card) return
    const id = card.subtopic.id
    if (!done.has(id)) {
      setDone(prev => new Set([...prev, id]))
      setSessionDone(prev => new Set([...prev, id]))
      try { await studyApi.toggle(id) } catch {}
    }
    next()
  }

  const next = () => {
    if (index >= deck.length - 1) {
      setStarted(false)
      return
    }
    setFlipped(false)
    setTimeout(() => setIndex(i => i + 1), 50)
  }

  const prev = () => {
    if (index === 0) return
    setFlipped(false)
    setTimeout(() => setIndex(i => i - 1), 50)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started) return
      if (e.key === 'ArrowRight' || e.key === 'n') next()
      else if (e.key === 'ArrowLeft' || e.key === 'p') prev()
      else if (e.key === ' ' || e.key === 'f') { e.preventDefault(); setFlipped(v => !v) }
      else if (e.key === 'd') markDone()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index, deck, done])

  const totalSubtopics = STUDY_GUIDE.reduce((n, t) => n + t.subtopics.length, 0)

  if (!started) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers size={24} className="text-primary-600" />
            Flashcards
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Flip through study topics. Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Space</kbd> to flip,{' '}
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">→</kbd> next,{' '}
            <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">d</kbd> to mark done.
          </p>
        </div>

        {sessionDone.size > 0 && (
          <div className="card bg-green-50 border-green-200 p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-500 shrink-0" />
            <p className="text-sm text-green-700">
              You marked <strong>{sessionDone.size}</strong> topic{sessionDone.size !== 1 ? 's' : ''} as done in the last session!
            </p>
          </div>
        )}

        <div className="card space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
            <select
              value={selectedTopicId}
              onChange={e => setSelectedTopicId(e.target.value)}
              className="input w-full text-sm"
            >
              <option value="all">All Topics</option>
              {STUDY_GUIDE.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Show</label>
            <div className="flex gap-2">
              {(['all', 'todo', 'done'] as FilterMode[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterMode(f)}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    filterMode === f
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'todo' ? 'To Study' : 'Already Done'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {(() => {
              const allCards: Card[] = STUDY_GUIDE.flatMap(topic =>
                topic.subtopics.map(subtopic => ({ subtopic, topic }))
              )
              const count = allCards.filter(c => {
                if (selectedTopicId !== 'all' && c.topic.id !== selectedTopicId) return false
                if (filterMode === 'todo') return !done.has(c.subtopic.id)
                if (filterMode === 'done') return done.has(c.subtopic.id)
                return true
              }).length
              return <><strong>{count}</strong> cards in deck &bull; {done.size}/{totalSubtopics} topics mastered</>
            })()}
          </div>

          <button onClick={startSession} className="btn-primary w-full flex items-center justify-center gap-2">
            <Shuffle size={16} /> Start Flashcards
          </button>
        </div>
      </div>
    )
  }

  const card = deck[index]
  if (!card) return null

  const isDone = done.has(card.subtopic.id)
  const progress = Math.round(((index + 1) / deck.length) * 100)

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStarted(false)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft size={16} /> Setup
        </button>
        <span className="text-sm text-gray-500">{index + 1} / {deck.length}</span>
        <button onClick={startSession} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <Shuffle size={14} /> Reshuffle
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flashcard */}
      <div
        className="cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(v => !v)}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '260px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 backface-hidden card flex flex-col items-center justify-center p-8 text-center space-y-3"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-4xl">{card.topic.icon}</span>
            <div>
              <p className="text-xs text-gray-400 mb-1">{card.topic.name}</p>
              <p className="text-xl font-bold text-gray-900">{card.subtopic.name}</p>
            </div>
            <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', difficultyColor[card.subtopic.difficulty])}>
              {card.subtopic.difficulty}
            </span>
            <p className="text-xs text-gray-400 mt-4">Click or press Space to reveal</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 card flex flex-col items-center justify-center p-8 text-center space-y-4 bg-primary-50 border-primary-200"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-3xl">{card.topic.icon}</span>
            <div className="space-y-1">
              <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">{card.topic.name}</p>
              <p className="text-lg font-bold text-gray-900">{card.subtopic.name}</p>
            </div>

            {card.subtopic.tags && card.subtopic.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {card.subtopic.tags.map(tag => (
                  <span key={tag} className="text-xs bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <a
              href={card.subtopic.gfgUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Open on GeeksforGeeks <ExternalLink size={11} />
            </a>

            {isDone && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 size={13} /> Already marked done
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <button
          onClick={markDone}
          disabled={isDone}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors border',
            isDone
              ? 'bg-green-50 text-green-600 border-green-200 cursor-default opacity-60'
              : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
          )}
        >
          <CheckCircle2 size={15} />
          {isDone ? 'Done' : 'Mark Done & Next'}
        </button>

        <button
          onClick={next}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200"
        >
          {index >= deck.length - 1 ? (
            <><RotateCcw size={15} /> Finish</>
          ) : (
            <>Next <ChevronRight size={16} /></>
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-400">
        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Space</kbd> flip &nbsp;·&nbsp;
        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">←/→</kbd> navigate &nbsp;·&nbsp;
        <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">d</kbd> mark done
      </p>
    </div>
  )
}
