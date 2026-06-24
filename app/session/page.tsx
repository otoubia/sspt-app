'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'task' | 'computing' | 'results' | 'end'
type Validity = 'idle' | 'checking' | 'valid' | 'invalid'

interface TaskResult {
  word1: string
  word5: string
  userWords: [string, string, string]
  submittedLength: number
  optimalLength: number
  circuitousness: number
  optimalOrdering: [number, number, number]
}

// ─── Main session component ────────────────────────────────────────────────────

export default function SessionPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [pair, setPair] = useState<{ word1: string; word5: string } | null>(null)
  const [inputs, setInputs] = useState<[string, string, string]>(['', '', ''])
  const [validities, setValidities] = useState<[Validity, Validity, Validity]>(['idle', 'idle', 'idle'])
  const [lastResult, setLastResult] = useState<TaskResult | null>(null)
  const [completedTasks, setCompletedTasks] = useState<TaskResult[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const timers = useRef<(ReturnType<typeof setTimeout> | null)[]>([null, null, null])

  // ── Fetch a new random word pair ──────────────────────────────────────────

  const fetchPair = useCallback(async () => {
    setPhase('loading')
    setInputs(['', '', ''])
    setValidities(['idle', 'idle', 'idle'])
    setFetchError(null)
    setSubmitError(null)
    try {
      const res = await fetch('/api/word-pair')
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to load word pair')
      setPair(data)
      setPhase('task')
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not load a word pair.')
    }
  }, [])

  useEffect(() => { fetchPair() }, [fetchPair])

  // ── Per-word validation (debounced 600 ms) ────────────────────────────────

  const checkWord = useCallback(async (word: string, idx: 0 | 1 | 2) => {
    const w = word.trim().toLowerCase()
    if (!w) {
      setValidities(v => { const n = [...v] as typeof v; n[idx] = 'idle'; return n })
      return
    }
    setValidities(v => { const n = [...v] as typeof v; n[idx] = 'checking'; return n })
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: w }),
      })
      const data = await res.json()
      setValidities(v => { const n = [...v] as typeof v; n[idx] = data.valid ? 'valid' : 'invalid'; return n })
    } catch {
      setValidities(v => { const n = [...v] as typeof v; n[idx] = 'invalid'; return n })
    }
  }, [])

  const handleInput = (idx: 0 | 1 | 2, val: string) => {
    setInputs(prev => { const n = [...prev] as typeof prev; n[idx] = val; return n })
    setValidities(v => { const n = [...v] as typeof v; n[idx] = val.trim() ? 'idle' : 'idle'; return n })
    if (timers.current[idx]) clearTimeout(timers.current[idx]!)
    timers.current[idx] = setTimeout(() => checkWord(val, idx), 600)
  }

  // ── Submit guard ──────────────────────────────────────────────────────────

  const canSubmit = (): boolean => {
    if (!pair || phase !== 'task') return false
    const trimmed = inputs.map(i => i.trim().toLowerCase())
    return (
      trimmed.every(i => i.length > 0) &&
      validities.every(v => v === 'valid') &&
      new Set(trimmed).size === 3 &&
      !trimmed.includes(pair.word1.toLowerCase()) &&
      !trimmed.includes(pair.word5.toLowerCase())
    )
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!pair || !canSubmit()) return
    setPhase('computing')
    setSubmitError(null)
    try {
      const trimmed = inputs.map(i => i.trim().toLowerCase()) as [string, string, string]
      const res = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word1: pair.word1, word5: pair.word5, words: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Computation failed')
      const result: TaskResult = {
        word1: pair.word1,
        word5: pair.word5,
        userWords: trimmed,
        ...data,
      }
      setLastResult(result)
      setCompletedTasks(prev => [...prev, result])
      setPhase('results')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong.')
      setPhase('task')
    }
  }

  // ── Session stats ─────────────────────────────────────────────────────────

  const totalTasks = completedTasks.length
  const optimalCount = completedTasks.filter(t => t.circuitousness <= 1.0005).length
  const pct = totalTasks > 0 ? Math.round((100 * optimalCount) / totalTasks) : 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Home
          </Link>
          {totalTasks > 0 ? (
            <div className="text-sm text-gray-500">
              Optimal: <span className="font-semibold text-gray-700">{optimalCount}/{totalTasks}</span>
              <span className="text-gray-400 ml-1">({pct}%)</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">New session</span>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Loading */}
          {phase === 'loading' && !fetchError && (
            <div className="p-10 flex flex-col items-center gap-3 text-gray-400">
              <Spinner />
              <span className="text-sm">Loading word pair…</span>
            </div>
          )}

          {/* Fetch error */}
          {fetchError && (
            <div className="p-8 text-center space-y-4">
              <p className="text-red-500 text-sm">{fetchError}</p>
              <button
                onClick={fetchPair}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Task form */}
          {(phase === 'task' || phase === 'computing') && pair && (
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-700 mb-0.5">
                Find a way to connect these two words:
              </p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {pair.word1.toUpperCase()}{' '}
                <span className="text-gray-300 font-normal">and</span>{' '}
                {pair.word5.toUpperCase()}
              </p>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Each word in the sequence should be as closely related as possible to the word
                before it. Fill in the 3 missing words.
              </p>

              <div className="space-y-2.5">
                <FixedWordRow label="Word 1" word={pair.word1} />

                {([0, 1, 2] as const).map(idx => (
                  <InputWordRow
                    key={idx}
                    label={`Word ${idx + 2}`}
                    value={inputs[idx]}
                    validity={validities[idx]}
                    disabled={phase === 'computing'}
                    autoFocus={idx === 0}
                    onChange={val => handleInput(idx, val)}
                  />
                ))}

                <FixedWordRow label="Word 5" word={pair.word5} />
              </div>

              {/* Duplicate / overlap warning */}
              {cannotSubmitReason(pair, inputs, validities) && (
                <p className="mt-3 text-xs text-amber-600">
                  {cannotSubmitReason(pair, inputs, validities)}
                </p>
              )}

              {submitError && (
                <p className="mt-3 text-xs text-red-500">{submitError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit() || phase === 'computing'}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm
                             hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {phase === 'computing' ? 'Computing…' : 'Submit'}
                </button>
                <button
                  onClick={() => setPhase('end')}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm
                             hover:bg-gray-50 transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'results' && lastResult && (
            <ResultsView
              result={lastResult}
              totalTasks={totalTasks}
              optimalCount={optimalCount}
              onNext={fetchPair}
              onEnd={() => setPhase('end')}
            />
          )}

          {/* End of session */}
          {phase === 'end' && (
            <EndView
              tasks={completedTasks}
              onRestart={() => { setCompletedTasks([]); fetchPair() }}
            />
          )}
        </div>
      </div>
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FixedWordRow({ label, word }: { label: string; word: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-14 shrink-0 text-right">{label}</span>
      <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg
                      text-sm font-semibold text-gray-600 tracking-wide">
        {word.toUpperCase()}
      </div>
    </div>
  )
}

function InputWordRow({
  label,
  value,
  validity,
  disabled,
  autoFocus,
  onChange,
}: {
  label: string
  value: string
  validity: Validity
  disabled?: boolean
  autoFocus?: boolean
  onChange: (v: string) => void
}) {
  const borderColor =
    validity === 'valid'   ? 'border-green-400 bg-green-50 focus:ring-green-200' :
    validity === 'invalid' ? 'border-red-400 bg-red-50 focus:ring-red-200' :
                             'border-gray-200 focus:border-blue-400 focus:ring-blue-100'

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-14 shrink-0 text-right">{label}</span>
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder="type a word…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm outline-none
                        focus:ring-2 transition-colors disabled:opacity-50 ${borderColor}`}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm select-none">
            {validity === 'checking' && <span className="text-gray-300 animate-pulse">·</span>}
            {validity === 'valid'    && <span className="text-green-500">✓</span>}
            {validity === 'invalid'  && <span className="text-red-400">✗</span>}
          </span>
        </div>
      </div>
      {validity === 'invalid' && value.trim() && (
        <p className="mt-1 ml-[4.25rem] text-xs text-red-500">
          Word not recognized — please check spelling or try a different word.
        </p>
      )}
    </div>
  )
}

function ResultsView({
  result,
  totalTasks,
  optimalCount,
  onNext,
  onEnd,
}: {
  result: TaskResult
  totalTasks: number
  optimalCount: number
  onNext: () => void
  onEnd: () => void
}) {
  const isOptimal = result.circuitousness <= 1.0005
  const optimalWords = result.optimalOrdering.map(i => result.userWords[i]) as [string, string, string]
  const pct = Math.round((100 * optimalCount) / totalTasks)

  return (
    <div className="p-6 space-y-5">

      {/* Score banner */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${
        isOptimal ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
      }`}>
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">Circuitousness</p>
          <p className={`text-4xl font-bold tabular-nums ${isOptimal ? 'text-green-600' : 'text-slate-700'}`}>
            {result.circuitousness.toFixed(3)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">1.000 = perfectly optimal</p>
        </div>
        {isOptimal
          ? <span className="text-4xl">🎯</span>
          : (
            <div className="text-right">
              <p className="text-xs text-gray-400">Could be</p>
              <p className="text-2xl font-bold text-green-600">1.000</p>
            </div>
          )
        }
      </div>

      {/* Paths */}
      <div className="space-y-4">
        <PathDisplay
          label="Your path"
          words={[result.word1, ...result.userWords, result.word5]}
          length={result.submittedLength}
          variant={isOptimal ? 'optimal' : 'submitted'}
        />
        {!isOptimal && (
          <PathDisplay
            label="Optimal ordering of your words"
            words={[result.word1, ...optimalWords, result.word5]}
            length={result.optimalLength}
            variant="optimal"
          />
        )}
      </div>

      {/* Session progress */}
      <div className="text-center text-sm text-gray-400">
        Session: {totalTasks} task{totalTasks !== 1 ? 's' : ''} ·{' '}
        <span className="text-gray-600 font-medium">{optimalCount} optimal ({pct}%)</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm
                     hover:bg-blue-700 transition-colors"
        >
          Next Task
        </button>
        <button
          onClick={onEnd}
          className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm
                     hover:bg-gray-50 transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  )
}

function PathDisplay({
  label,
  words,
  length,
  variant,
}: {
  label: string
  words: string[]
  length: number
  variant: 'submitted' | 'optimal'
}) {
  const chip =
    variant === 'optimal'
      ? 'bg-green-100 text-green-800 border border-green-200'
      : 'bg-blue-50 text-blue-800 border border-blue-100'

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {words.map((w, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide ${chip}`}>
              {w.toUpperCase()}
            </span>
            {i < words.length - 1 && <span className="text-gray-300 text-xs">→</span>}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        Total Euclidean distance: <span className="tabular-nums font-medium">{length.toFixed(4)}</span>
      </p>
    </div>
  )
}

function EndView({
  tasks,
  onRestart,
}: {
  tasks: TaskResult[]
  onRestart: () => void
}) {
  const optimalCount = tasks.filter(t => t.circuitousness <= 1.0005).length
  const avg = tasks.length > 0
    ? tasks.reduce((s, t) => s + t.circuitousness, 0) / tasks.length
    : 0
  const pct = tasks.length > 0 ? Math.round((100 * optimalCount) / tasks.length) : 0

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-gray-400 text-sm">No tasks completed.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onRestart} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors">
            Start Again
          </button>
          <Link href="/" className="px-5 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Session Complete</h2>
        <p className="text-sm text-gray-400 mt-0.5">Here's how you did</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tasks', value: String(tasks.length) },
          { label: 'Optimal', value: `${optimalCount} / ${tasks.length}` },
          { label: 'Avg score', value: avg.toFixed(3) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-800 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="text-sm text-center text-gray-500">
        You submitted the optimal ordering on <strong>{pct}%</strong> of tasks.
      </div>

      {/* Per-task list */}
      <div className="max-h-56 overflow-y-auto space-y-1">
        {tasks.map((t, i) => {
          const ok = t.circuitousness <= 1.0005
          return (
            <div
              key={i}
              className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-500 text-xs">
                {t.word1.toUpperCase()} → {t.word5.toUpperCase()}
              </span>
              <span className={`font-semibold tabular-nums text-xs ${ok ? 'text-green-600' : 'text-gray-600'}`}>
                {t.circuitousness.toFixed(3)}{ok && ' ✓'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          New Session
        </button>
        <Link
          href="/"
          className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm
                     hover:bg-gray-50 transition-colors flex items-center"
        >
          Home
        </Link>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
  )
}

// Returns a human-readable reason the user can't submit yet (only when they've
// filled all fields and all are individually valid, but there's still a conflict).
function cannotSubmitReason(
  pair: { word1: string; word5: string },
  inputs: [string, string, string],
  validities: [Validity, Validity, Validity]
): string | null {
  const trimmed = inputs.map(i => i.trim().toLowerCase())
  const allFilled = trimmed.every(i => i.length > 0)
  const allValid = validities.every(v => v === 'valid')

  if (!allFilled || !allValid) return null

  if (new Set(trimmed).size < 3) {
    return 'Words 2, 3, and 4 must all be different.'
  }
  if (trimmed.includes(pair.word1.toLowerCase()) || trimmed.includes(pair.word5.toLowerCase())) {
    return 'Words 2, 3, and 4 must differ from the start and end words.'
  }
  return null
}
