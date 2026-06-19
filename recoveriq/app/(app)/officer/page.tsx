'use client'
import { useEffect, useState } from 'react'
import { formatKES } from '@/lib/format'

interface CaseRow {
  id: string
  loanNo: string
  borrowerName: string
  outstandingBalance: string
  status: string
  nextActionDate: string | null
}

interface ActionRow {
  id: string
  type: string
  outcome: string | null
  timestamp: string
  loanNo: string
  borrowerName: string
}

interface Data {
  queueSize: number
  dueToday: number
  brokenPromises: number
  cases: CaseRow[]
  recentActions: ActionRow[]
  target: { period: string; targetAmount: string | null; actualAmount: number }
}

export default function OfficerDashboardPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/officer-dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  if (!data) return <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load.</p>

  const target = data.target.targetAmount ? Number(data.target.targetAmount) : null
  const pct = target && target > 0 ? Math.round((data.target.actualAmount / target) * 100) : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Recovery Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your queue, follow-ups, and collection progress this month.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Open cases</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.queueSize}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Due today</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.dueToday}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Broken promises</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data.brokenPromises}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Target this month ({data.target.period})</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {pct !== null ? `${pct}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatKES(String(data.target.actualAmount))}
            {target ? ` / ${formatKES(String(target))}` : ''}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">My queue</h2>
          </div>
          {data.cases.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No open cases assigned.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data.cases.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-4">
                      <p className="font-medium">{c.borrowerName}</p>
                      <p className="text-xs text-gray-400">{c.loanNo}</p>
                    </td>
                    <td className="py-2 px-4">{formatKES(c.outstandingBalance)}</td>
                    <td className="py-2 px-4">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.status}</span>
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Recent activity</h2>
          </div>
          {data.recentActions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No actions logged yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.recentActions.map((a) => (
                <li key={a.id} className="py-2 px-4 text-sm">
                  <p>
                    <span className="font-medium">{a.type}</span>{' '}
                    <span className="text-gray-400">— {a.borrowerName} ({a.loanNo})</span>
                  </p>
                  {a.outcome && <p className="text-xs text-gray-500 dark:text-gray-400">{a.outcome}</p>}
                  <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
