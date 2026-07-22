import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Play, RotateCcw, Loader2, Terminal, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import axios from 'axios'

// Piston API — free, no key needed
const PISTON_URL = 'https://emkc.org/api/v2/piston/execute'

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
    starter: `# Write your solution here
def solution():
    pass

print(solution())`,
  },
  {
    id: 'javascript', label: 'JavaScript', monaco: 'javascript', version: '18.15.0',
    starter: `// Write your solution here
function solution() {

}

console.log(solution());`,
  },
  {
    id: 'java', label: 'Java', monaco: 'java', version: '15.0.2',
    starter: `public class Main {
    public static void main(String[] args) {
        System.out.println(solution());
    }

    static Object solution() {
        // Write your solution here
        return null;
    }
}`,
  },
  {
    id: 'cpp', label: 'C++', monaco: 'cpp', version: '10.2.0',
    starter: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here

    return 0;
}`,
  },
  {
    id: 'typescript', label: 'TypeScript', monaco: 'typescript', version: '5.0.3',
    starter: `// Write your solution here
function solution(): any {

}

console.log(solution());`,
  },
  {
    id: 'go', label: 'Go', monaco: 'go', version: '1.16.2',
    starter: `package main

import "fmt"

func main() {
    fmt.Println(solution())
}

func solution() interface{} {
    // Write your solution here
    return nil
}`,
  },
]

interface Props {
  questionText?: string
}

export default function CodeRunner({ questionText }: Props) {
  const [lang, setLang] = useState<Language>(LANGUAGES[0])
  const [code, setCode] = useState(LANGUAGES[0].starter)
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stdin, setStdin] = useState('')
  const [showStdin, setShowStdin] = useState(false)

  const switchLang = (l: Language) => {
    setLang(l)
    setCode(l.starter)
    setOutput(null)
    setError(null)
  }

  const runCode = useCallback(async () => {
    setRunning(true)
    setOutput(null)
    setError(null)
    try {
      const res = await axios.post(PISTON_URL, {
        language: lang.id,
        version: lang.version,
        files: [{ content: code }],
        stdin: stdin || '',
      })
      const run = res.data.run
      if (run.stderr) {
        setError(run.stderr)
      } else {
        setOutput(run.stdout || '(no output)')
      }
    } catch {
      setError('Failed to reach execution server. Check your internet connection.')
    } finally {
      setRunning(false)
    }
  }, [lang, code, stdin])

  const reset = () => {
    setCode(lang.starter)
    setOutput(null)
    setError(null)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700">
        <Terminal size={14} className="text-gray-400 shrink-0" />
        <span className="text-xs text-gray-400 font-medium flex-1">Code Runner</span>

        {/* Language selector */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 rounded-lg transition-colors">
            {lang.label}
            <ChevronDown size={11} />
          </button>
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 hidden group-hover:block min-w-[120px]">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                onClick={() => switchLang(l)}
                className={clsx(
                  'block w-full text-left px-3 py-1.5 text-xs transition-colors',
                  l.id === lang.id
                    ? 'text-primary-400 bg-gray-700'
                    : 'text-gray-300 hover:bg-gray-700'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={reset}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Reset to starter code"
        >
          <RotateCcw size={13} />
        </button>

        <button
          onClick={runCode}
          disabled={running}
          className="flex items-center gap-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {running
            ? <><Loader2 size={13} className="animate-spin" /> Running…</>
            : <><Play size={13} /> Run</>
          }
        </button>
      </div>

      {/* Editor */}
      <Editor
        height="300px"
        language={lang.monaco}
        value={code}
        onChange={(v) => setCode(v ?? '')}
        theme="vs-dark"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          folding: false,
          renderLineHighlight: 'line',
          padding: { top: 10, bottom: 10 },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontLigatures: true,
          tabSize: 4,
          wordWrap: 'on',
        }}
      />

      {/* Stdin toggle */}
      <div className="bg-gray-900 border-t border-gray-700 px-3 py-1.5">
        <button
          onClick={() => setShowStdin(v => !v)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showStdin ? '▾ Hide' : '▸ Show'} custom input (stdin)
        </button>
        {showStdin && (
          <textarea
            value={stdin}
            onChange={e => setStdin(e.target.value)}
            placeholder="Enter program input here..."
            rows={2}
            className="mt-1.5 w-full bg-gray-800 text-gray-200 text-xs font-mono px-2 py-1.5 rounded border border-gray-700 focus:outline-none focus:border-gray-500 resize-none placeholder-gray-600"
          />
        )}
      </div>

      {/* Output */}
      {(output !== null || error !== null) && (
        <div className={clsx(
          'bg-gray-950 border-t px-3 py-2.5 min-h-[60px] max-h-48 overflow-auto',
          error ? 'border-red-900' : 'border-gray-700'
        )}>
          <p className={clsx('text-xs font-semibold mb-1', error ? 'text-red-400' : 'text-green-400')}>
            {error ? '✖ Error' : '✔ Output'}
          </p>
          <pre className={clsx(
            'text-xs font-mono whitespace-pre-wrap leading-relaxed',
            error ? 'text-red-300' : 'text-gray-200'
          )}>
            {error ?? output}
          </pre>
        </div>
      )}
    </div>
  )
}
