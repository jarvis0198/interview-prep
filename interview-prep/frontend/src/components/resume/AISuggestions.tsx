import { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { resumeApi } from '../../services/api'
import type { ResumeSuggestionResponse } from '../../types'

interface Props {
  resumeId: number
  onApply?: (suggestions: string) => void
}

const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact Information',
  summary: 'Summary / Objective',
  experience: 'Work Experience',
  skills: 'Skills',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  general: 'General',
}

const SECTION_COLORS: Record<string, string> = {
  contact: 'bg-blue-50 border-blue-200 text-blue-700',
  summary: 'bg-purple-50 border-purple-200 text-purple-700',
  experience: 'bg-green-50 border-green-200 text-green-700',
  skills: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  education: 'bg-orange-50 border-orange-200 text-orange-700',
  projects: 'bg-pink-50 border-pink-200 text-pink-700',
  general: 'bg-gray-50 border-gray-200 text-gray-700',
}

export default function AISuggestions({ resumeId, onApply }: Props) {
  const [data, setData] = useState<ResumeSuggestionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const fetchSuggestions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await resumeApi.getSuggestions(resumeId)
      setData(res.data)
      // Expand all sections by default
      const exp: Record<string, boolean> = {}
      Object.keys(res.data.sectionSuggestions).forEach((k) => { exp[k] = true })
      setExpanded(exp)
    } catch {
      setError('Failed to get suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleApply = () => {
    if (!data || !onApply) return
    const lines: string[] = ['\n\n--- AI SUGGESTIONS ---']
    Object.entries(data.sectionSuggestions).forEach(([section, tips]) => {
      lines.push(`\n${SECTION_LABELS[section] || section}:`)
      tips.forEach((t) => lines.push(`  • ${t}`))
    })
    if (data.overallTip) lines.push(`\nOverall Tip: ${data.overallTip}`)
    onApply(lines.join('\n'))
  }

  if (!data && !loading) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-primary-600" />
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">AI Resume Suggestions</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Get personalized, section-by-section feedback to improve your resume and stand out to recruiters.
        </p>
        <button onClick={fetchSuggestions} className="btn-primary">
          Get AI Suggestions
        </button>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Analyzing your resume...</p>
        <p className="text-gray-400 text-sm mt-1">This may take 10-20 seconds</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data?.overallTip && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <Lightbulb size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-800 text-sm mb-0.5">Overall Tip</div>
            <p className="text-sm text-amber-700">{data.overallTip}</p>
          </div>
        </div>
      )}

      {data && Object.entries(data.sectionSuggestions).map(([section, tips]) => {
        const colorClass = SECTION_COLORS[section] || SECTION_COLORS.general
        const label = SECTION_LABELS[section] || section
        const isOpen = expanded[section]
        return (
          <div key={section} className={`border rounded-xl overflow-hidden`}>
            <button
              onClick={() => toggle(section)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold ${colorClass} hover:opacity-90 transition-opacity`}
            >
              <span>{label}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-normal opacity-70">{tips.length} suggestions</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
            {isOpen && (
              <ul className="bg-white px-4 py-3 space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-primary-500 font-bold flex-shrink-0">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <div className="flex gap-3 pt-2">
        <button onClick={fetchSuggestions} className="btn-secondary text-sm">
          Refresh Suggestions
        </button>
        {onApply && (
          <button onClick={handleApply} className="btn-primary text-sm">
            Append to Editor
          </button>
        )}
      </div>
    </div>
  )
}
