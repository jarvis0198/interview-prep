import { useState, useMemo, useEffect, useCallback } from 'react'
import { STUDY_GUIDE, type Topic, type Subtopic } from '../data/studyGuide'
import { studyApi } from '../services/api'
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Search, CheckCircle2, Circle, RotateCcw, Trophy, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const difficultyStyle = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700',
}

const colorMap: Record<string, { ring: string; bg: string; text: string; progress: string; badge: string }> = {
  blue:    { ring: 'ring-blue-200',    bg: 'bg-blue-50',    text: 'text-blue-700',    progress: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700' },
  cyan:    { ring: 'ring-cyan-200',    bg: 'bg-cyan-50',    text: 'text-cyan-700',    progress: 'bg-cyan-500',    badge: 'bg-cyan-100 text-cyan-700' },
  orange:  { ring: 'ring-orange-200',  bg: 'bg-orange-50',  text: 'text-orange-700',  progress: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700' },
  green:   { ring: 'ring-green-200',   bg: 'bg-green-50',   text: 'text-green-700',   progress: 'bg-green-500',   badge: 'bg-green-100 text-green-700' },
  purple:  { ring: 'ring-purple-200',  bg: 'bg-purple-50',  text: 'text-purple-700',  progress: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-700' },
  yellow:  { ring: 'ring-yellow-200',  bg: 'bg-yellow-50',  text: 'text-yellow-700',  progress: 'bg-yellow-500',  badge: 'bg-yellow-100 text-yellow-700' },
  indigo:  { ring: 'ring-indigo-200',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  progress: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700' },
  teal:    { ring: 'ring-teal-200',    bg: 'bg-teal-50',    text: 'text-teal-700',    progress: 'bg-teal-500',    badge: 'bg-teal-100 text-teal-700' },
  rose:    { ring: 'ring-rose-200',    bg: 'bg-rose-50',    text: 'text-rose-700',    progress: 'bg-rose-500',    badge: 'bg-rose-100 text-rose-700' },
  sky:     { ring: 'ring-sky-200',     bg: 'bg-sky-50',     text: 'text-sky-700',     progress: 'bg-sky-500',     badge: 'bg-sky-100 text-sky-700' },
  fuchsia: { ring: 'ring-fuchsia-200', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', progress: 'bg-fuchsia-500', badge: 'bg-fuchsia-100 text-fuchsia-700' },
  amber:   { ring: 'ring-amber-200',   bg: 'bg-amber-50',   text: 'text-amber-700',   progress: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700' },
  lime:    { ring: 'ring-lime-200',    bg: 'bg-lime-50',    text: 'text-lime-700',    progress: 'bg-lime-500',    badge: 'bg-lime-100 text-lime-700' },
}

interface SubtopicRowProps {
  subtopic: Subtopic
  done: boolean
  onToggle: () => void
  toggling: boolean
}

function SubtopicRow({ subtopic, done, onToggle, toggling }: SubtopicRowProps) {
  return (
    <div className={clsx(
      'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors group',
      done ? 'bg-gray-50' : 'hover:bg-gray-50'
    )}>
      <button
        onClick={onToggle}
        disabled={toggling}
        className={clsx(
          'shrink-0 transition-colors',
          toggling ? 'opacity-40 cursor-wait' :
          done ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'
        )}
        title={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      <div className="flex-1 min-w-0">
        <span className={clsx(
          'text-sm font-medium',
          done ? 'line-through text-gray-400' : 'text-gray-800'
        )}>
          {subtopic.name}
        </span>
        {subtopic.tags && subtopic.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {subtopic.tags.map(tag => (
              <span key={tag} className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <span className={clsx(
        'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
        difficultyStyle[subtopic.difficulty]
      )}>
        {subtopic.difficulty}
      </span>

      <a
        href={subtopic.gfgUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded-lg transition-colors"
        onClick={e => e.stopPropagation()}
        title="Open on GeeksforGeeks"
      >
        <span className="hidden sm:inline">GFG</span>
        <ExternalLink size={11} />
      </a>
    </div>
  )
}

interface TopicCardProps {
  topic: Topic
  done: Set<string>
  onToggle: (id: string) => void
  toggling: string | null
  defaultOpen?: boolean
}

function TopicCard({ topic, done, onToggle, toggling, defaultOpen = false }: TopicCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const colors = colorMap[topic.color] ?? colorMap.blue

  const doneCount = topic.subtopics.filter(s => done.has(s.id)).length
  const total = topic.subtopics.length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const complete = doneCount === total

  return (
    <div className={clsx(
      'rounded-xl border bg-white shadow-sm overflow-hidden ring-1',
      complete ? 'ring-green-300 border-green-200' : `${colors.ring} border-gray-100`
    )}>
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-2xl shrink-0">{topic.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{topic.name}</span>
            {complete && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Trophy size={10} /> Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
              <div
                className={clsx('h-full rounded-full transition-all duration-300', complete ? 'bg-green-500' : colors.progress)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {doneCount}/{total}
            </span>
          </div>
        </div>
        <div className={clsx('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', colors.badge)}>
          {pct}%
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50 px-2 py-1">
          {topic.subtopics.map(sub => (
            <SubtopicRow
              key={sub.id}
              subtopic={sub}
              done={done.has(sub.id)}
              onToggle={() => onToggle(sub.id)}
              toggling={toggling === sub.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard'] as const
type DiffFilter = typeof DIFFICULTY_FILTERS[number]

export default function StudyGuidePage() {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('All')
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'todo'>('all')

  // Load from server on mount
  useEffect(() => {
    studyApi.getProgress()
      .then(r => setDone(new Set(r.data)))
      .catch(() => setDone(new Set()))
      .finally(() => setLoading(false))
  }, [])

  const totalSubtopics = STUDY_GUIDE.reduce((n, t) => n + t.subtopics.length, 0)
  const totalDone = done.size
  const overallPct = totalSubtopics > 0 ? Math.round((totalDone / totalSubtopics) * 100) : 0

  const toggle = useCallback(async (id: string) => {
    if (toggling) return
    // Optimistic update
    setDone(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    setToggling(id)
    try {
      const r = await studyApi.toggle(id)
      setDone(new Set(r.data))
    } catch {
      // Rollback on failure
      setDone(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
    } finally {
      setToggling(null)
    }
  }, [toggling])

  const resetAll = async () => {
    if (!confirm('Reset all progress?')) return
    setDone(new Set())
    try {
      const r = await studyApi.reset()
      setDone(new Set(r.data))
    } catch {
      // re-fetch on failure
      studyApi.getProgress().then(r => setDone(new Set(r.data)))
    }
  }

  const filteredTopics = useMemo(() => {
    const q = search.toLowerCase().trim()
    return STUDY_GUIDE
      .map(topic => {
        const filtered = topic.subtopics.filter(s => {
          const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.tags?.some(t => t.includes(q)))
          const matchDiff = diffFilter === 'All' || s.difficulty === diffFilter
          const matchStatus =
            statusFilter === 'all' ? true :
            statusFilter === 'done' ? done.has(s.id) :
            !done.has(s.id)
          return matchSearch && matchDiff && matchStatus
        })
        return { ...topic, subtopics: filtered }
      })
      .filter(t => t.subtopics.length > 0)
  }, [search, diffFilter, statusFilter, done])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={24} className="text-primary-600" />
            Study Guide
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Topics &amp; subtopics to master before your interviews — with GeeksforGeeks links.
          </p>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RotateCcw size={12} />
          Reset progress
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Loading your progress…</span>
        </div>
      ) : (
        <>

      {/* Overall progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-800">Overall Progress</p>
            <p className="text-sm text-gray-500">{totalDone} of {totalSubtopics} subtopics completed</p>
          </div>
          <div className="text-2xl font-bold text-primary-600">{overallPct}%</div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {/* Per-topic mini bars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {STUDY_GUIDE.map(topic => {
            const cnt = topic.subtopics.filter(s => done.has(s.id)).length
            const pct = topic.subtopics.length > 0 ? Math.round((cnt / topic.subtopics.length) * 100) : 0
            const colors = colorMap[topic.color] ?? colorMap.blue
            return (
              <div key={topic.id} className="text-xs">
                <div className="flex justify-between text-gray-500 mb-0.5">
                  <span>{topic.icon} {topic.name.split(' ')[0]}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : colors.progress)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className="input pl-9 py-2 text-sm"
            placeholder="Search topics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {DIFFICULTY_FILTERS.map(d => (
            <button
              key={d}
              onClick={() => setDiffFilter(d)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                diffFilter === d ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'todo', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize',
                statusFilter === f ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {f === 'todo' ? 'To Do' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      {filteredTopics.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No topics match your filters.</p>
          <button onClick={() => { setSearch(''); setDiffFilter('All'); setStatusFilter('all') }}
            className="text-sm text-primary-600 mt-2 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              done={done}
              onToggle={toggle}
              toggling={toggling}
              defaultOpen={i === 0 && !search}
            />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  )
}
