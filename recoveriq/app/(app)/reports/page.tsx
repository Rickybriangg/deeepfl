'use client'

const REPORTS = [
  { type: 'loans', label: 'Full Loan Book Export (Recovery Report)', desc: 'Every loan account with derived fields' },
  { type: 'daily-collection', label: 'Daily Collection Report', desc: 'Payments logged and amounts collected, grouped by day' },
  { type: 'officer-performance', label: 'Collector Performance Report', desc: 'Payments logged and amounts recovered by officer' },
  { type: 'overdue-analysis', label: 'Overdue Analysis', desc: 'Every account currently in arrears' },
  { type: 'aging', label: 'Aging Report (CBK-style)', desc: 'Arrears buckets with account counts and outstanding totals' },
  { type: 'default-report', label: 'Default Report', desc: 'Accounts more than 180 days overdue' },
  { type: 'portfolio-risk', label: 'Portfolio Risk Report', desc: 'Outstanding and account counts by recovery tier' },
  { type: 'recovery-trend', label: 'Recovery Trend Analysis', desc: 'Daily portfolio snapshots: outstanding, overdue, recovery rate, PAR, default rate' },
  { type: 'branch-comparison', label: 'Branch Comparison Report', desc: 'Outstanding and account counts by branch' },
]

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Export portfolio and performance reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r) => (
          <div key={r.type} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">{r.label}</h3>
            <p className="text-sm text-gray-500 mb-4">{r.desc}</p>
            <div className="flex gap-2">
              <a
                href={`/api/reports/export?type=${r.type}&format=csv`}
                className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg"
              >
                Export CSV
              </a>
              <a
                href={`/api/reports/export?type=${r.type}&format=xlsx`}
                className="text-sm border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg"
              >
                Export Excel
              </a>
              <a
                href={`/api/reports/export?type=${r.type}&format=pdf`}
                className="text-sm border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg"
              >
                Export PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
