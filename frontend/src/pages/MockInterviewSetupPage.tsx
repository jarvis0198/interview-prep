import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResumeSelector from '../components/resume/ResumeSelector'
import { questionsApi } from '../services/api'
import { Mic, Building2, Briefcase, Loader2, Brain, Code2, LayoutTemplate, Users, Briefcase as BriefcaseIcon, Shuffle } from 'lucide-react'
import clsx from 'clsx'

const ROUNDS = [
  {
    id: 'Behavioral',
    label: 'Behavioral',
    icon: Users,
    color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    activeColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-300',
    desc: '8 STAR-format questions on teamwork, leadership & conflict resolution',
    badge: '8 Qs',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'Technical',
    label: 'Technical',
    icon: Code2,
    color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
    activeColor: 'border-purple-500 bg-purple-100 ring-2 ring-purple-300',
    desc: '8 questions on algorithms, code design, debugging & system internals',
    badge: '8 Qs',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'DSA',
    label: 'DSA / Coding',
    icon: Brain,
    color: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
    activeColor: 'border-orange-500 bg-orange-100 ring-2 ring-orange-300',
    desc: '8 full problem statements with examples — arrays, trees, DP, graphs',
    badge: '8 Qs',
    badgeColor: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'System Design',
    label: 'System Design',
    icon: LayoutTemplate,
    color: 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100',
    activeColor: 'border-teal-500 bg-teal-100 ring-2 ring-teal-300',
    desc: '6 design questions on scalability, APIs, databases & distributed systems',
    badge: '6 Qs',
    badgeColor: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'HR',
    label: 'HR Screening',
    icon: BriefcaseIcon,
    color: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    activeColor: 'border-green-500 bg-green-100 ring-2 ring-green-300',
    desc: '8 HR questions on motivation, culture fit, salary & career goals',
    badge: '8 Qs',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    id: 'Role-Specific',
    label: 'Role-Specific',
    icon: Briefcase,
    color: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
    activeColor: 'border-rose-500 bg-rose-100 ring-2 ring-rose-300',
    desc: '8 questions tailored to your resume experience, projects & domain',
    badge: '8 Qs',
    badgeColor: 'bg-rose-100 text-rose-700',
  },
]

export default function MockInterviewSetupPage() {
  const navigate = useNavigate()
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [selectedRound, setSelectedRound] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canStart = !!resumeId && !!company.trim() && !!selectedRound

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)
    setError('')
    try {
      const res = await questionsApi.generateMockInterview(
        resumeId!,
        company.trim(),
        role.trim(),
        selectedRound!,
      )
      navigate(`/mock/${res.data.sessionId}`)
    } catch {
      setError('Failed to generate mock interview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mic size={22} className="text-primary-600" />
          Mock Interview
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick a round, get AI-generated questions tailored to your resume & company, and practice with a timer.
        </p>
      </div>

      {/* Setup card */}
      <div className="card space-y-5">
        <ResumeSelector selectedId={resumeId} onSelect={setResumeId} />

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
          />
        </div>
      </div>

      {/* Round selector */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Choose Interview Round
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {ROUNDS.map((round) => {
            const Icon = round.icon
            const active = selectedRound === round.id
            return (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.id)}
                className={clsx(
                  'text-left p-4 rounded-xl border-2 transition-all space-y-2',
                  active ? round.activeColor : round.color
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={17} />
                    <span className="font-semibold text-sm">{round.label}</span>
                  </div>
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', round.badgeColor)}>
                    {round.badge}
                  </span>
                </div>
                <p className="text-xs opacity-80 leading-snug">{round.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!canStart || loading}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating questions… this may take 15–30 seconds
          </>
        ) : (
          <>
            <Mic size={17} />
            Start {selectedRound ? `${selectedRound} Round` : 'Mock Interview'}
          </>
        )}
      </button>
    </div>
  )
}
