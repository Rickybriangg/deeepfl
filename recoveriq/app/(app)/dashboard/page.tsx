'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KpiCard } from '@/components/KpiCard'
import { formatKES, formatKESCompact, formatPercent, formatNumber } from '@/lib/format'
import { DELINQUENCY_STAGES } from '@/lib/recovery-logic'

type Breakdown = Record<string, { count: number; outstanding: string }>

interface Analytics {
  totalOutstanding: string
  totalOverdue?: string
  totalAccounts: number
  activeCases: number
  recoveryRate: number | null
  nplRatio: number | null
  par30: number | null
  defaultRate?: number | null
  delinquencyBreakdown?: Breakdown
  dueToday?: number
  dueThisWeek?: number
  dueThisMonth?: number
}

// Color accent per delinquency stage (least → most severe).
const STAGE_COLORS: Record<string, string> = {
  Current: 'bg-green-100 text-green-700',
  'Due Today': 'bg-sky-100 text-sky-700',
  '1-7 Days Overdue': 'bg-yellow-100 text-yellow-700',
  '8-30 Days Overdue': 'bg-amber-100 text-amber-700',
  '31-60 Days Overdue': 'bg-orange-100 text-orange-700',
  '61-90 Days Overdue': 'bg-orange-200 text-orange-800',
  '91-180 Days Overdue': 'bg-red-100 text-red-700',
  Defaulted: 'bg-red-200 text-red-800',
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const hasData = !loading && data && data.totalAccounts > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Portfolio overview — YEDF Loan Recovery</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard
          title="Total Outstanding"
          value={data ? formatKESCompact(data.totalOutstanding) : '—'}
          subtitle="KES"
          accent="blue"
        />
        <KpiCard
          title="Total Overdue"
          value={data ? formatKESCompact(data.totalOverdue ?? '0') : '—'}
          subtitle="KES"
          accent="red"
        />
        <KpiCard
          title="Recovery Rate"
          value={data ? formatPercent(data.recoveryRate) : '—'}
          subtitle="Lifetime"
          accent="green"
        />
        <KpiCard
          title="NPL Ratio"
          value={data ? formatPercent(data.nplRatio) : '—'}
          subtitle="Non-performing"
          accent="red"
        />
        <KpiCard
          title="PAR > 30"
          value={data ? formatPercent(data.par30) : '—'}
          subtitle="Portfolio at risk"
          accent="amber"
        />
        <KpiCard
          title="Default Rate"
          value={data ? formatPercent(data.defaultRate ?? null) : '—'}
          subtitle=">180 days overdue"
          accent="red"
        />
        <KpiCard
          title="Total Accounts"
          value={data ? formatNumber(data.totalAccounts) : '—'}
          subtitle="Loan accounts"
          accent="purple"
        />
        <KpiCard
          title="Active Cases"
          value={data ? formatNumber(data.activeCases) : '—'}
          subtitle="In recovery"
          accent="blue"
        />
        <KpiCard
          title="Due Today"
          value={data ? formatNumber(data.dueToday ?? 0) : '—'}
          subtitle="Loans"
          accent="amber"
        />
        <KpiCard
          title="Due This Week"
          value={data ? formatNumber(data.dueThisWeek ?? 0) : '—'}
          subtitle="Loans"
          accent="amber"
        />
        <KpiCard
          title="Due This Month"
          value={data ? formatNumber(data.dueThisMonth ?? 0) : '—'}
          subtitle="Loans"
          accent="amber"
        />
      </div>

      {!hasData ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">No loan data loaded</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Import your loan book (.xlsx or .csv) to populate the dashboard with portfolio analytics.
          </p>
          <Link
            href="/import"
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Import Loan Book
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <DelinquencySection breakdown={data!.delinquencyBreakdown} />

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Total outstanding: {formatKES(data!.totalOutstanding)}. See the{' '}
              <Link href="/portfolio" className="text-blue-700 font-medium">
                Portfolio
              </Link>{' '}
              page for full breakdowns and charts.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function DelinquencySection({ breakdown }: { breakdown?: Breakdown }) {
  if (!breakdown) return null
  const totalCount = DELINQUENCY_STAGES.reduce(
    (sum, s) => sum + (breakdown[s]?.count ?? 0),
    0
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Delinquency Staging
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Accounts classified by days overdue
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DELINQUENCY_STAGES.map((stage) => {
          const entry = breakdown[stage] ?? { count: 0, outstanding: '0' }
          const pct = totalCount > 0 ? (entry.count / totalCount) * 100 : 0
          return (
            <div
              key={stage}
              className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 flex flex-col gap-1"
            >
              <span
                className={`self-start text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  STAGE_COLORS[stage] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {stage}
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(entry.count)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {pct.toFixed(1)}% · {formatKESCompact(entry.outstanding)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
