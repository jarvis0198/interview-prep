import { useState, useEffect, useMemo } from 'react'
import { questionsApi } from '../services/api'
import type { GithubQuestion } from '../types'
import {
  Building2, ExternalLink, Search, AlertCircle, Loader2, Github, Code2
} from 'lucide-react'
import clsx from 'clsx'
import CodeRunner from '../components/CodeRunner'

const TOP_COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Netflix', 'Uber', 'Airbnb', 'LinkedIn', 'Bloomberg',
  'Adobe', 'Stripe', 'Lyft', 'Atlassian', 'ByteDance',
]

function occurrenceLabel(n: number): { label: string; color: string } {
  if (n >= 20) return { label: 'Very High', color: 'bg-red-100 text-red-700' }
  if (n >= 10) return { label: 'High', color: 'bg-orange-100 text-orange-700' }
  if (n >= 5)  return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Low', color: 'bg-gray-100 text-gray-500' }
}

export default function CompanyQuestionsPage() {
  const [companies, setCompanies] = useState<string[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [questions, setQuestions] = useState<GithubQuestion[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [showAllCompanies, setShowAllCompanies] = useState(false)
  const [showTopOnly, setShowTopOnly] = useState(true)
  const [practiceUrl, setPracticeUrl] = useState<string | null>(null)

  useEffect(() => {
    questionsApi.getGithubCompanies()
      .then(r => setCompanies(r.data))
      .catch(() => setCompanies(TOP_COMPANIES))
      .finally(() => setLoadingCompanies(false))
  }, [])

  const handleSelectCompany = async (company: string) => {
    if (company === selectedCompany) return
    setSelectedCompany(company)
    setQuestions([])
    setSearch('')
    setError('')
    setPracticeUrl(null)
    setLoadingQuestions(true)
    try {
      const r = await questionsApi.getGithubQuestions(company)
      setQuestions(r.data)
    } catch {
      setError(`Failed to load questions for ${company}.`)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase().trim()
    const list = showTopOnly && !companySearch
      ? companies.filter(c => TOP_COMPANIES.includes(c))
      : companies
    if (!q) return list
    return companies.filter(c => c.toLowerCase().includes(q))
  }, [companies, companySearch, showTopOnly])

  const filteredQuestions = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return questions
    return questions.filter(qu => qu.title.toLowerCase().includes(q))
  }, [questions, search])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Github size={24} className="text-gray-700" />
          Company Questions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Real LeetCode questions asked by top companies — sourced from GitHub.
        </p>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar: company picker */}
        <div className="w-56 shrink-0 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="input pl-8 py-2 text-sm w-full"
              placeholder="Search companies…"
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
            />
          </div>

          {!companySearch && (
            <div className="flex gap-1">
              <button
                onClick={() => setShowTopOnly(true)}
                className={clsx('flex-1 text-xs py-1 rounded-md font-medium transition-colors',
                  showTopOnly ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
              >
                Top
              </button>
              <button
                onClick={() => setShowTopOnly(false)}
                className={clsx('flex-1 text-xs py-1 rounded-md font-medium transition-colors',
                  !showTopOnly ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
              >
                All {companies.length > 0 && `(${companies.length})`}
              </button>
            </div>
          )}

          <div className="space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loadingCompanies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No companies found.</p>
            ) : (
              filteredCompanies.map(company => (
                <button
                  key={company}
                  onClick={() => handleSelectCompany(company)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate',
                    selectedCompany === company
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {company}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedCompany ? (
            <div className="card text-center py-16 text-gray-400">
              <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Select a company to view questions</p>
              <p className="text-sm mt-1">Questions are sorted by frequency — most asked first.</p>
            </div>
          ) : loadingQuestions ? (
            <div className="card text-center py-16">
              <Loader2 size={36} className="animate-spin text-primary-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Fetching {selectedCompany} questions from GitHub…</p>
            </div>
          ) : error ? (
            <div className="card flex items-center gap-3 text-red-600 py-6 justify-center">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <>
              {/* Company header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Building2 size={18} className="text-primary-600" />
                    {selectedCompany}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {filteredQuestions.length} of {questions.length} questions
                    {questions.length > 0 && (
                      <span className="ml-1 text-xs text-gray-400">
                        · sorted by frequency
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    className="input pl-8 py-2 text-sm"
                    placeholder="Filter questions…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="card text-center py-12 text-gray-400">
                  <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-500">No questions found for {selectedCompany}</p>
                  <p className="text-xs mt-1">This company may not be in the GitHub dataset yet.</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="card text-center py-10 text-gray-400">
                  <p className="text-sm">No questions match your search.</p>
                  <button onClick={() => setSearch('')} className="text-xs text-primary-600 mt-1 hover:underline">
                    Clear filter
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Table header */}
                  <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span>#</span>
                    <span>Problem</span>
                    <span className="text-right">Frequency</span>
                    <span></span>
                    <span></span>
                  </div>
                  {filteredQuestions.map(q => {
                    const freq = occurrenceLabel(q.occurrences)
                    const isPracticing = practiceUrl === q.url
                    const syntheticId = Math.abs(q.url.split('/').pop()?.split('-').reduce((acc, s) => acc * 31 + s.charCodeAt(0), 0) ?? 0) % 1000000
                    return (
                      <div key={q.url}>
                        <div
                          className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-gray-50 transition-colors group"
                        >
                          <span className="text-xs text-gray-400 font-mono">{q.rank}</span>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors">
                              {q.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {q.occurrences > 1 && (
                              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', freq.color)}>
                                ×{q.occurrences}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setPracticeUrl(isPracticing ? null : q.url)}
                            className={clsx(
                              'shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-colors',
                              isPracticing
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-green-700 hover:border-green-200'
                            )}
                          >
                            <Code2 size={11} />
                            <span className="hidden sm:inline">{isPracticing ? 'Close' : 'Practice'}</span>
                          </button>
                          <a
                            href={q.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-1 rounded-lg transition-colors"
                            title="Open on LeetCode"
                          >
                            <span className="hidden sm:inline">LC</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        {isPracticing && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                            <CodeRunner
                              questionId={syntheticId}
                              questionText={q.title}
                              hideTestCases
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
