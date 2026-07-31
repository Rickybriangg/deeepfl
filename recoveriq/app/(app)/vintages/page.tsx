'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
} from 'recharts'
import { KpiCard } from '@/components/KpiCard'
import { formatKES, formatKESCompact, formatPercent, formatNumber } from '@/lib/format'

interface Vintage {
  id: string
  fiscalYear: string
  sortKey: number
  approvedAmount: string
  outstandingBalance: string
  amountDue: string
  amountRecovered: string
  recoveryRate: number | null
  loansIssued: number
  isAggregate: boolean
}

function rateColor(rate: number | null): string {
  const r = rate ?? 0
  return r >= 80 ? '#16a34a' : r >= 50 ? '#f59e0b' : '#dc2626'
}

export default function VintagesPage() {
  const [vintages, setVintages] = useState<Vintage[] | null>(null)

  useEffect(() => {
    fetch('/api/vintages')
      .then((r) => r.json())
      .then((d) => setVintages(d.vintages ?? []))
      .catch(() => setVintages([]))
  }, [])

  const totals = useMemo(() => {
    if (!vintages) return null
    const sum = (k: keyof Vintage) =>
      vintages.reduce((s, v) => s + Number(v[k] as string), 0)
    const approved = sum('approvedAmount')
    const due = sum('amountDue')
    const recovered = sum('amountRecovered')
    const outstanding = sum('outstandingBalance')
    const loans = vintages.reduce((s, v) => s + v.loansIssued, 0)
    return {
      approved,
      due,
      recovered,
      outstanding,
      loans,
      rate: due > 0 ? (recovered / due) * 100 : null,
    }
  }, [vintages])

  const chartData = useMemo(
    () =>
      (vintages ?? []).map((v) => ({
        fy: v.fiscalYear.replace('FY ', '').replace(/\/\d{2}(\d{2})/, '/$1'),
        approved: Number(v.approvedAmount),
        recovered: Number(v.amountRecovered),
        rate: v.recoveryRate ?? 0,
      })),
    [vintages]
  )

  const loading = vintages === null
  const empty = !loading && vintages.length === 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vintage Analysis</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Disbursement &amp; recovery by financial year — how each lending cohort has performed
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard title="Total Approved" value={totals ? formatKESCompact(String(totals.approved)) : '—'} subtitle="KES · all vintages" accent="blue" />
        <KpiCard title="Amount Due" value={totals ? formatKESCompact(String(totals.due)) : '—'} subtitle="KES" accent="amber" />
        <KpiCard title="Recovered" value={totals ? formatKESCompact(String(totals.recovered)) : '—'} subtitle="KES" accent="green" />
        <KpiCard title="Outstanding" value={totals ? formatKESCompact(String(totals.outstanding)) : '—'} subtitle="KES" accent="red" />
        <KpiCard title="Recovery Rate" value={totals ? formatPercent(totals.rate) : '—'} subtitle="Recovered / due" accent="green" />
        <KpiCard title="Loans Issued" value={totals ? formatNumber(totals.loans) : '—'} subtitle="All years" accent="purple" />
      </div>

      {empty ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">No vintage data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Import the disbursement &amp; repayment report (SUMMARY sheet) to populate fiscal-year
            vintage analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Recovery rate by vintage</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Recovered as a share of amount due</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="fy" fontSize={10} angle={-35} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => `${v}%`} fontSize={11} width={44} />
                  <Tooltip formatter={(v) => formatPercent(Number(v))} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.fy} fill={rateColor(d.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Approved vs recovered</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Disbursement volume against amount clawed back</p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData} margin={{ top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="fy" fontSize={10} angle={-35} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => formatKESCompact(v)} fontSize={11} width={64} />
                  <Tooltip formatter={(v) => formatKESCompact(Number(v))} />
                  <Bar dataKey="approved" name="Approved" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Line dataKey="recovered" name="Recovered" stroke="#16a34a" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">Financial Year</th>
                    <th className="px-4 py-3 text-right">Approved</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3 text-right">Recovered</th>
                    <th className="px-4 py-3 text-right">Recovery</th>
                    <th className="px-4 py-3 text-right">Loans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(vintages ?? []).map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {v.fiscalYear}
                        {v.isAggregate && (
                          <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            combined
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatKES(v.approvedAmount)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatKES(v.outstandingBalance)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatKES(v.amountDue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatKES(v.amountRecovered)}</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: rateColor(v.recoveryRate) }}>
                        {formatPercent(v.recoveryRate)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatNumber(v.loansIssued)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
