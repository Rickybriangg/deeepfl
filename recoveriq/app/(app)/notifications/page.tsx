'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatNumber } from '@/lib/format'

interface Notifications {
  loansDueToday: number
  overdueAccounts: number
  missedPromises: number
  highRiskCustomers: number
  inactiveCollectors: { id: string; name: string; assignedCases: number }[]
  escalationEvents: { id: string; timestamp: string; entityId: string | null; actor: string }[]
}

export default function NotificationsPage() {
  const [data, setData] = useState<Notifications | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time alerts across the portfolio</p>
      </div>

      {loading || !data ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AlertCard
              title="Loans Due Today"
              count={data.loansDueToday}
              href="/dashboard"
              accent="amber"
            />
            <AlertCard
              title="Overdue Accounts"
              count={data.overdueAccounts}
              href="/portfolio"
              accent="red"
            />
            <AlertCard
              title="Missed Promises to Pay"
              count={data.missedPromises}
              href="/cases?view=brokenPTP"
              accent="red"
            />
            <AlertCard
              title="High-Risk Customers"
              count={data.highRiskCustomers}
              href="/watchlist?worklist=doubtful"
              accent="amber"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Collector Inactivity</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Officers with assigned cases but no logged action in the last 7 days
            </p>
            {data.inactiveCollectors.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No inactive collectors.</p>
            ) : (
              <ul className="space-y-2">
                {data.inactiveCollectors.map((o) => (
                  <li key={o.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 dark:text-gray-100">{o.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{o.assignedCases} assigned cases</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Escalation Events</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Auto-escalated broken promises, last 7 days</p>
            {data.escalationEvents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No escalation events.</p>
            ) : (
              <ul className="space-y-2">
                {data.escalationEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 dark:text-gray-100">
                      Case <Link href="/cases?view=brokenPTP" className="text-blue-700 font-medium">{e.entityId}</Link> escalated
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AlertCard({
  title,
  count,
  href,
  accent,
}: {
  title: string
  count: number
  href: string
  accent: 'amber' | 'red'
}) {
  const accentClass = accent === 'amber' ? 'text-amber-600' : 'text-red-600'
  return (
    <Link
      href={href}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 transition-colors block"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${accentClass}`}>{formatNumber(count)}</p>
    </Link>
  )
}
