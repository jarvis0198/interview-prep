import { useEffect, useState } from 'react'
import { questionsApi } from '../services/api'
import { studyApi } from '../services/api'
import { STUDY_GUIDE } from '../data/studyGuide'
import type { PrepSession } from '../types'
import { BarChart2, Trophy, Target, BookOpen, Building2, Calendar, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

// ── Mini SVG bar chart ──────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-gray-600">{d.value > 0 ? d.value : ''}</span>
          <div
            className={clsx('w-full rounded-t transition-all duration-500', d.color ?? 'bg-primary-400')}
            style={{ height: `${Math.max((d.value / max) * 72, d.value > 0 ? 4 : 0)}px` }}
          />
          <span className="text-xs text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Donut ring ──────────────────────────────────────────────────────────────
function DonutRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={13} fontWeight="700" fill="#374151">
        {pct}%
      </text>
    </svg>
  )
}

// ── Stat card ───────────────────────────────────────────────────────────────
function Stat({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const [sessions, setSessions] = useState<PrepSession[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([
      questionsApi.getSessions(),
      studyApi.getProgress(),
    ]).then(([sessRes, progRes]) => {
      setSessions(sessRes.data)
      setDone(new Set(progRes.data))
    }).catch(() => { setError(true) }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>
  }

  if (error) {
    return <div className="text-center py-20 text-red-400">Failed to load progress data. Please try again.</div>
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalSubtopics = STUDY_GUIDE.reduce((n, t) => n + t.subtopics.length, 0)
  const studyPct = totalSubtopics > 0 ? Math.round((done.size / totalSubtopics) * 100) : 0

  // Sessions by company (top 6)
  const companyCounts: Record<string, number> = {}
  for (const s of sessions) {
    companyCounts[s.companyName] = (companyCounts[s.companyName] ?? 0) + 1
  }
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  // Sessions over last 7 days
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const sessionsByDay = dayLabels.map(d => {
    const label = d.toLocaleDateString(undefined, { weekday: 'short' })
    const value = sessions.filter(s => {
      const sd = new Date(s.createdAt)
      return sd.toDateString() === d.toDateString()
    }).length
    return { label, value }
  })

  // Study guide per-topic
  const topicProgress = STUDY_GUIDE.map(t => {
    const doneCount = t.subtopics.filter(s => done.has(s.id)).length
    return { label: t.name.split(' ')[0], value: doneCount, total: t.subtopics.length }
  })

  // Most prepared company
  const topCompany = topCompanies[0]?.[0] ?? '—'
  const activeDays = new Set(sessions.map(s => new Date(s.createdAt).toDateString())).size
  const streak = (() => {
    let s = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (sessions.some(sess => new Date(sess.createdAt).toDateString() === d.toDateString())) {
        s++
      } else break
    }
    return s
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 size={24} className="text-primary-600" />
          Progress Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your interview prep at a glance.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Sessions" value={sessions.length} icon={Target} color="bg-primary-500" />
        <Stat label="Study Topics Done" value={`${done.size}/${totalSubtopics}`} icon={BookOpen} color="bg-green-500" />
        <Stat label="Active Days" value={activeDays} icon={Calendar} color="bg-amber-500" />
        <Stat label="Day Streak" value={streak > 0 ? `${streak}d` : '—'} icon={TrendingUp} color="bg-rose-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Study progress rings */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen size={16} className="text-green-600" /> Study Guide Progress
          </h2>
          <div className="flex items-center gap-4">
            <DonutRing pct={studyPct} color="#22c55e" size={88} />
            <div className="space-y-1 flex-1">
              <p className="text-sm text-gray-600">{done.size} of {totalSubtopics} subtopics mastered</p>
              {topicProgress.filter(t => t.value > 0).slice(0, 4).map(t => (
                <div key={t.label} className="text-xs">
                  <div className="flex justify-between text-gray-500 mb-0.5">
                    <span>{t.label}</span>
                    <span>{t.value}/{t.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${Math.round((t.value / t.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sessions last 7 days */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={16} className="text-primary-600" /> Sessions — Last 7 Days
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No sessions yet.</p>
          ) : (
            <BarChart data={sessionsByDay} />
          )}
        </div>
      </div>

      {/* Company breakdown */}
      {topCompanies.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 size={16} className="text-primary-600" /> Companies Practiced
          </h2>
          <BarChart
            data={topCompanies.map(([label, value]) => ({ label, value, color: 'bg-primary-400' }))}
          />
        </div>
      )}

      {/* Achievements */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Trophy size={16} className="text-yellow-500" /> Achievements
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'First Session', earned: sessions.length >= 1, icon: '🚀' },
            { label: '5 Sessions', earned: sessions.length >= 5, icon: '🔥' },
            { label: '10 Sessions', earned: sessions.length >= 10, icon: '💪' },
            { label: 'First Topic Done', earned: done.size >= 1, icon: '📖' },
            { label: '50% Study Guide', earned: studyPct >= 50, icon: '⭐' },
            { label: 'Study Master', earned: studyPct === 100, icon: '🏆' },
            { label: 'Top Company: ' + topCompany, earned: sessions.length > 0, icon: '🏢' },
            { label: '3-Day Streak', earned: streak >= 3, icon: '🗓️' },
            { label: '7-Day Streak', earned: streak >= 7, icon: '🌟' },
          ].map(a => (
            <div
              key={a.label}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                a.earned
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
              )}
            >
              <span className="text-lg">{a.earned ? a.icon : '🔒'}</span>
              <span className="text-xs font-medium leading-tight">{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
