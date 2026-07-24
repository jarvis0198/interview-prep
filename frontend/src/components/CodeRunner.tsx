import { useState, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { Play, RotateCcw, Loader2, Terminal, ChevronDown, FlaskConical, CheckCircle2, XCircle, Clock, Send } from 'lucide-react'
import clsx from 'clsx'
import axios from 'axios'
import { questionsApi } from '../services/api'

const CODE_RUN_URL = '/api/code/run'

interface Language {
  id: string
  label: string
  monaco: string
  version: string
  starter: string
}

const LANGUAGES: Language[] = [
  {
    id: 'python', label: 'Python', monaco: 'python', version: '3.10.0',
    starter: `# Write your solution here\n# Read input with: input() or sys.stdin\n\nimport sys\n\ndef solve():\n    # your code here\n    pass\n\nsolve()`,
  },
  {
    id: 'javascript', label: 'JavaScript', monaco: 'javascript', version: '18.15.0',
    starter: `// Write your solution here\n// Read input: process.stdin\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n\nfunction solve(lines) {\n    // your code here\n}\n\nconsole.log(solve(lines));`,
  },
  {
    id: 'java', label: 'Java', monaco: 'java', version: '15.0.2',
    starter: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // your code here\n    }\n}`,
  },
  {
    id: 'cpp', label: 'C++', monaco: 'cpp', version: '10.2.0',
    starter: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // your code here\n    return 0;\n}`,
  },
  {
    id: 'typescript', label: 'TypeScript', monaco: 'typescript', version: '5.0.3',
    starter: `import * as fs from 'fs';\nconst lines = fs.readFileSync('/dev/stdin','utf8').trim().split('\\n');\n\nfunction solve(lines: string[]): string {\n    // your code here\n    return '';\n}\n\nconsole.log(solve(lines));`,
  },
  {
    id: 'go', label: 'Go', monaco: 'go', version: '1.16.2',
    starter: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    _ = reader\n    // your code here\n    fmt.Println()\n}`,
  },
]

interface TestCase {
  id: number
  input: string
  expectedOutput: string
  description: string
}

type CaseStatus = 'idle' | 'running' | 'pass' | 'fail' | 'error'

interface CaseResult {
  status: CaseStatus
  actual?: string
  error?: string
  time?: number
}

interface Props {
  questionId: number
  questionText?: string
  onAllPassed?: () => void
  hideTestCases?: boolean
}

function normalise(s: string) {
  return s.trim().replace(/\r\n/g, '\n').replace(/\n+$/, '')
}

function storageKey(questionId: number, langId: string) {
  return `code_runner_${questionId}_${langId}`
}

function loadSaved(questionId: number, lang: Language): string {
  try {
    return localStorage.getItem(storageKey(questionId, lang.id)) ?? lang.starter
  } catch {
    return lang.starter
  }
}

function saveCode(questionId: number, langId: string, code: string) {
  try {
    localStorage.setItem(storageKey(questionId, langId), code)
  } catch {}
}

export default function CodeRunner({ questionId, questionText, onAllPassed, hideTestCases }: Props) {
  const [lang, setLang] = useState<Language>(LANGUAGES[0])
  const [code, setCode] = useState(() => loadSaved(questionId, LANGUAGES[0]))
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loadingCases, setLoadingCases] = useState(false)
  const [results, setResults] = useState<Record<number, CaseResult>>({})
  const [runningAll, setRunningAll] = useState(false)
  const [activeCase, setActiveCase] = useState<number | null>(null)
  // custom run tab
  const [customInput, setCustomInput] = useState('')
  const [customOutput, setCustomOutput] = useState<string | null>(null)
  const [customError, setCustomError] = useState<string | null>(null)
  const [runningCustom, setRunningCustom] = useState(false)
  const [tab, setTab] = useState<'testcases' | 'custom'>(hideTestCases ? 'custom' : 'testcases')

  // Load test cases (skip when hideTestCases is set — e.g. company questions page)
  useEffect(() => {
    if (!questionId || hideTestCases) return
    setLoadingCases(true)
    questionsApi.getTestCases(questionId)
      .then(res => {
        try {
          const parsed: TestCase[] = JSON.parse(res.data.testCases ?? '[]')
          setTestCases(parsed)
        } catch {
          setTestCases([])
        }
      })
      .catch(() => setTestCases([]))
      .finally(() => setLoadingCases(false))
  }, [questionId])

  const switchLang = (l: Language) => {
    setLang(l)
    setCode(loadSaved(questionId, l))
    setResults({})
    setCustomOutput(null)
    setCustomError(null)
  }

  const runSingle = useCallback(async (tc: TestCase): Promise<CaseResult> => {
    const t0 = Date.now()
    try {
      const res = await axios.post(CODE_RUN_URL, {
        language: lang.id,
        version: lang.version,
        files: [{ content: code }],
        stdin: tc.input,
      })
      const run = res.data.run
      const time = Date.now() - t0
      if (run.code !== 0 || run.stderr) {
        return { status: 'error', error: run.stderr || run.stdout, time }
      }
      const actual = normalise(run.stdout ?? '')
      const expected = normalise(tc.expectedOutput)
      return {
        status: actual === expected ? 'pass' : 'fail',
        actual,
        time,
      }
    } catch {
      return { status: 'error', error: 'Network error — could not reach execution server.' }
    }
  }, [lang, code])

  const runAll = useCallback(async () => {
    if (testCases.length === 0) return
    setRunningAll(true)
    setResults({})
    const newResults: Record<number, CaseResult> = {}
    for (const tc of testCases) {
      setResults(prev => ({ ...prev, [tc.id]: { status: 'running' } }))
      const result = await runSingle(tc)
      newResults[tc.id] = result
      setResults(prev => ({ ...prev, [tc.id]: result }))
    }
    setRunningAll(false)
    const allPass = testCases.every(tc => newResults[tc.id]?.status === 'pass')
    if (allPass && onAllPassed) onAllPassed()
  }, [testCases, runSingle, onAllPassed])

  const runCustom = useCallback(async () => {
    setRunningCustom(true)
    setCustomOutput(null)
    setCustomError(null)
    try {
      const res = await axios.post(CODE_RUN_URL, {
        language: lang.id,
        version: lang.version,
        files: [{ content: code }],
        stdin: customInput,
      })
      const run = res.data.run
      if (run.code !== 0 || run.stderr) {
        setCustomError(run.stderr || 'Runtime error')
      } else {
        setCustomOutput(run.stdout || '(no output)')
      }
    } catch {
      setCustomError('Network error — could not reach execution server.')
    } finally {
      setRunningCustom(false)
    }
  }, [lang, code, customInput])

  const passCount = testCases.filter(tc => results[tc.id]?.status === 'pass').length
  const allPassed = testCases.length > 0 && passCount === testCases.length
  const anyRun = Object.keys(results).length > 0

  const statusIcon = (s: CaseStatus) => {
    if (s === 'running') return <Loader2 size={13} className="animate-spin text-blue-400" />
    if (s === 'pass') return <CheckCircle2 size={13} className="text-green-400" />
    if (s === 'fail') return <XCircle size={13} className="text-red-400" />
    if (s === 'error') return <XCircle size={13} className="text-orange-400" />
    return <div className="w-3 h-3 rounded-full bg-gray-600" />
  }

  const statusLabel = (s: CaseStatus) => {
    if (s === 'pass') return <span className="text-green-400 font-semibold">Passed</span>
    if (s === 'fail') return <span className="text-red-400 font-semibold">Wrong Answer</span>
    if (s === 'error') return <span className="text-orange-400 font-semibold">Runtime Error</span>
    if (s === 'running') return <span className="text-blue-400">Running…</span>
    return null
  }

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 shadow-lg">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-950 border-b border-gray-800">
        <Terminal size={14} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-400 font-medium flex-1">Code Runner</span>

        {/* Language dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors">
            {lang.label} <ChevronDown size={11} />
          </button>
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 hidden group-hover:block min-w-[130px]">
            {LANGUAGES.map(l => (
              <button key={l.id} onClick={() => switchLang(l)}
                className={clsx('block w-full text-left px-3 py-1.5 text-xs transition-colors',
                  l.id === lang.id ? 'text-primary-400 bg-gray-700' : 'text-gray-300 hover:bg-gray-700')}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => { setCode(lang.starter); saveCode(questionId, lang.id, lang.starter); setResults({}) }}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Reset">
          <RotateCcw size={13} />
        </button>

        {/* Run All Tests */}
        {!hideTestCases && (
          <button onClick={runAll} disabled={runningAll || loadingCases || testCases.length === 0}
            className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
            {runningAll ? <><Loader2 size={13} className="animate-spin" /> Running…</> : <><FlaskConical size={13} /> Run Tests</>}
          </button>
        )}
      </div>

      {/* Editor */}
      <Editor
        height="320px"
        language={lang.monaco}
        value={code}
        onChange={v => {
          const newCode = v ?? ''
          setCode(newCode)
          saveCode(questionId, lang.id, newCode)
        }}
        theme="vs-dark"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          folding: false,
          renderLineHighlight: 'line',
          padding: { top: 10, bottom: 10 },
          fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
          fontLigatures: true,
          tabSize: 4,
          wordWrap: 'on',
        }}
      />

      {/* Bottom panel */}
      <div className="border-t border-gray-800">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-gray-800">
          {!hideTestCases && (
            <button onClick={() => setTab('testcases')}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5',
                tab === 'testcases' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300')}>
              <FlaskConical size={12} />
              Test Cases
              {anyRun && (
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-bold',
                  allPassed ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300')}>
                  {passCount}/{testCases.length}
                </span>
              )}
            </button>
          )}
          <button onClick={() => setTab('custom')}
            className={clsx('px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5',
              tab === 'custom' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300')}>
            <Play size={12} /> Custom Input
          </button>
        </div>

        {/* Test cases panel */}
        {tab === 'testcases' && (
          <div className="bg-gray-900 p-3 space-y-2 max-h-72 overflow-y-auto">
            {loadingCases && (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-4 justify-center">
                <Loader2 size={14} className="animate-spin" /> Generating test cases…
              </div>
            )}
            {!loadingCases && testCases.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No test cases available.</p>
            )}
            {testCases.map(tc => {
              const res = results[tc.id]
              const isActive = activeCase === tc.id
              return (
                <div key={tc.id}
                  className={clsx('rounded-lg border transition-colors cursor-pointer',
                    res?.status === 'pass' ? 'border-green-800 bg-green-950' :
                    res?.status === 'fail' ? 'border-red-900 bg-red-950' :
                    res?.status === 'error' ? 'border-orange-900 bg-orange-950' :
                    'border-gray-700 bg-gray-800 hover:border-gray-600'
                  )}
                  onClick={() => setActiveCase(isActive ? null : tc.id)}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    {statusIcon(res?.status ?? 'idle')}
                    <span className="text-xs text-gray-300 flex-1 font-medium">
                      Case {tc.id}: {tc.description}
                    </span>
                    {res?.time && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={10} /> {res.time}ms
                      </span>
                    )}
                    {res && statusLabel(res.status)}
                    <span className="text-gray-600 text-xs">{isActive ? '▲' : '▼'}</span>
                  </div>

                  {isActive && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-700 pt-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Input</p>
                        <pre className="text-xs text-gray-300 bg-gray-900 rounded px-2 py-1.5 font-mono whitespace-pre-wrap">{tc.input || '(empty)'}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Expected Output</p>
                        <pre className="text-xs text-green-300 bg-gray-900 rounded px-2 py-1.5 font-mono">{tc.expectedOutput}</pre>
                      </div>
                      {res?.status === 'fail' && res.actual !== undefined && (
                        <div>
                          <p className="text-xs text-red-400 mb-1 font-medium">Your Output</p>
                          <pre className="text-xs text-red-300 bg-gray-900 rounded px-2 py-1.5 font-mono">{res.actual}</pre>
                        </div>
                      )}
                      {res?.status === 'error' && res.error && (
                        <div>
                          <p className="text-xs text-orange-400 mb-1 font-medium">Error</p>
                          <pre className="text-xs text-orange-300 bg-gray-900 rounded px-2 py-1.5 font-mono whitespace-pre-wrap">{res.error}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Submit button — only when all pass */}
            {anyRun && (
              <div className={clsx('mt-3 rounded-lg p-3 flex items-center justify-between gap-3',
                allPassed ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700')}>
                <div className="text-xs">
                  {allPassed
                    ? <span className="text-green-300 font-semibold">✓ All {testCases.length} test cases passed!</span>
                    : <span className="text-gray-400">{passCount}/{testCases.length} passing — fix failing cases to submit</span>
                  }
                </div>
                <button
                  disabled={!allPassed}
                  onClick={onAllPassed}
                  className={clsx('flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors',
                    allPassed
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  )}
                >
                  <Send size={13} /> Submit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom input panel */}
        {tab === 'custom' && (
          <div className="bg-gray-900 p-3 space-y-2">
            <div>
              <p className="text-xs text-gray-400 mb-1 font-medium">Custom stdin</p>
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="Enter input here..."
                rows={3}
                className="w-full bg-gray-800 text-gray-200 text-xs font-mono px-2 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-gray-500 resize-none placeholder-gray-600"
              />
            </div>
            <button onClick={runCustom} disabled={runningCustom}
              className="flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
              {runningCustom ? <><Loader2 size={13} className="animate-spin" /> Running…</> : <><Play size={13} /> Run</>}
            </button>
            {(customOutput !== null || customError !== null) && (
              <div className={clsx('rounded-lg px-3 py-2 border',
                customError ? 'bg-red-950 border-red-900' : 'bg-gray-800 border-gray-700')}>
                <p className={clsx('text-xs font-semibold mb-1', customError ? 'text-red-400' : 'text-green-400')}>
                  {customError ? '✖ Error' : '✔ Output'}
                </p>
                <pre className={clsx('text-xs font-mono whitespace-pre-wrap', customError ? 'text-red-300' : 'text-gray-200')}>
                  {customError ?? customOutput}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
