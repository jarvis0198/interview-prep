import { useEffect, useState, useMemo } from 'react'
import { questionsApi } from '../services/api'
import type { PrepSession } from '../types'
import { useNavigate } from 'react-router-dom'
import { Building2, Calendar, ChevronRight, History, Briefcase, Trash2, Mic, Search, Code2, MessageSquare } from 'lucide-react'
import { SessionSkeleton } from '../components/Skeleton'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<PrepSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    questionsApi
      .getSessions()
      .then((r) => setSessions(r.data))
      .catch(() => setError('Failed to load sessions.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return sessions
    return sessions.filter(s =>
      s.companyName.toLowerCase().includes(q) ||
      (s.targetRole ?? '').toLowerCase().includes(q)
    )
  }, [sessions, search])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Delete this session?')) return
    const prev = sessions
    setSessions((s) => s.filter((x) => x.id !== id))
    try {
      await questionsApi.deleteSession(id)
    } catch {
      setSessions(prev)
      alert('Failed to delete session.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <SessionSkeleton />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History size={24} />
          Prep History
          {sessions.length > 0 && (
            <span className="text-sm font-normal text-gray-400">— {sessions.length} sessions</span>
          )}
        </h1>
        {sessions.length > 0 && (
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="input pl-8 py-2 text-sm w-52"
              placeholder="Search company or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No sessions yet.</p>
          <p className="text-sm mt-1">Generate your first set of questions from the home page.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-5 text-sm"
          >
            Generate Questions
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">No sessions match "{search}".</p>
          <button onClick={() => setSearch('')} className="text-xs text-primary-600 mt-1 hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/questions/${s.id}`)}
              className="card w-full text-left hover:shadow-md hover:border-primary-200 border border-transparent transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                <Building2 size={18} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-base">{s.companyName}</p>
                {s.targetRole && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Briefcase size={12} />
                    {s.targetRole}
                  </p>
                )}
                {(s.oaCount !== undefined || s.interviewCount !== undefined) && (
                  <div className="flex items-center gap-2 mt-1">
                    {(s.oaCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        <Code2 size={10} /> {s.oaCount} DSA
                      </span>
                    )}
                    {(s.interviewCount ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        <MessageSquare size={10} /> {s.interviewCount} Interview
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                  <Calendar size={11} />
                  {new Date(s.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(s.createdAt).toLocaleTimeString(undefined, {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/mock/${s.id}`) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors shrink-0"
                title="Start mock interview"
              >
                <Mic size={13} /> Mock Interview
              </button>
              <button
                onClick={(e) => handleDelete(e, s.id)}
                className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
                title="Delete session"
              >
                <Trash2 size={15} />
              </button>
              <ChevronRight
                size={18}
                className="text-gray-300 group-hover:text-primary-400 transition-colors shrink-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
