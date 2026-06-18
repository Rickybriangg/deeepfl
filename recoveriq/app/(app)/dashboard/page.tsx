'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KpiCard } from '@/components/KpiCard'
import { formatKES, formatKESCompact, formatPercent, formatNumber } from '@/lib/format'

interface Analytics {
  totalOutstanding: string
  totalAccounts: number
  activeCases: number
  recoveryRate: number | null
  nplRatio: number | null
  par30: number | null
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Portfolio overview — YEDF Loan Recovery</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard
          title="Total Outstanding"
          value={data ? formatKESCompact(data.totalOutstanding) : '—'}
          subtitle="KES"
          accent="blue"
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
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No loan data loaded</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600">
            Total outstanding: {formatKES(data!.totalOutstanding)}. See the{' '}
            <Link href="/portfolio" className="text-blue-700 font-medium">
              Portfolio
            </Link>{' '}
            page for full breakdowns and charts.
          </p>
        </div>
      )}
    </div>
  )
}
