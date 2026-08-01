'use client'
import { useState } from 'react'

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'letter', label: 'Demand letter' },
]
const TONES = [
  { value: 'friendly', label: 'Friendly reminder' },
  { value: 'firm', label: 'Firm' },
  { value: 'final', label: 'Final notice' },
]

interface Draft {
  message: string
  model: string
  riskBand: string
  riskScore: number
  recommendedStrategy: string
}

const BAND_STYLES: Record<string, string> = {
  Low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function AiAssistantPage() {
  const [loanNo, setLoanNo] = useState('')
  const [channel, setChannel] = useState('sms')
  const [tone, setTone] = useState('friendly')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDraft(null)
    setCopied(false)
    try {
      const res = await fetch('/api/ai/collection-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanNo: loanNo.trim(), channel, tone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to generate')
      setDraft(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Assistant</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Draft a collection message grounded in a loan&apos;s real figures and risk profile
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <form onSubmit={generate} className="space-y-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400">
              Loan number
              <input
                required
                value={loanNo}
                onChange={(e) => setLoanNo(e.target.value)}
                placeholder="e.g. LAP00004441"
                className={`${inputCls} mt-1 font-mono`}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400">
                Channel
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${inputCls} mt-1`}>
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-gray-500 dark:text-gray-400">
                Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={`${inputCls} mt-1`}>
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Drafting…' : 'Draft message'}
            </button>
          </form>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            The draft is grounded in the loan&apos;s stored figures — always review before sending.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Draft</h2>
            {draft && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(draft.message)
                  setCopied(true)
                }}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm px-4 py-3">
              {error}
            </div>
          ) : draft ? (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${BAND_STYLES[draft.riskBand] ?? BAND_STYLES.Low}`}>
                  Risk: {draft.riskBand} ({draft.riskScore})
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Suggested: {draft.recommendedStrategy}
                </span>
              </div>
              <pre className="flex-1 whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                {draft.message}
              </pre>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Generated by {draft.model}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 min-h-[200px]">
              Enter a loan number and generate a draft.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
