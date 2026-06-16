import Link from 'next/link'
import { KpiCard } from '@/components/KpiCard'

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Portfolio overview — YEDF Loan Recovery</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard
          title="Total Outstanding"
          value="—"
          subtitle="KES"
          accent="blue"
        />
        <KpiCard
          title="Recovery Rate"
          value="—"
          subtitle="Lifetime"
          accent="green"
        />
        <KpiCard
          title="NPL Ratio"
          value="—"
          subtitle="Non-performing"
          accent="red"
        />
        <KpiCard
          title="PAR > 30"
          value="—"
          subtitle="Portfolio at risk"
          accent="amber"
        />
        <KpiCard
          title="Total Accounts"
          value="—"
          subtitle="Loan accounts"
          accent="purple"
        />
        <KpiCard
          title="Active Cases"
          value="—"
          subtitle="In recovery"
          accent="blue"
        />
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">No loan data loaded</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          Import your loan book (.xlsx or .csv) to populate the dashboard with portfolio analytics.
        </p>
        <Link
          href="/import"
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Import Loan Book
        </Link>
      </div>
    </div>
  )
}
