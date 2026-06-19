'use client'
import { useEffect, useState } from 'react'
import { formatKES } from '@/lib/format'

type RiskBand = 'Low' | 'Medium' | 'High' | 'Critical'

interface RiskRow {
  loanNo: string
  borrowerName: string
  product: string
  outstandingBalance: string
  daysInArrears: number
  classification: string
  score: number
  band: RiskBand
  factors: string[]
  paymentProbability: number
  recommendedStrategy: string
  priority: number
}

const BAND_COLORS: Record<RiskBand, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

const BANDS: (RiskBand | 'all')[] = ['all', 'Critical', 'High', 'Medium', 'Low']

export default function RiskPage() {
  const [rows, setRows] = useState<RiskRow[]>([])
  const [distribution, setDistribution] = useState<Record<RiskBand, number>>({ Low: 0, Medium: 0, High: 0, Critical: 0 })
  const [loading, setLoading] = useState(true)
  const [band, setBand] = useState<RiskBand | 'all'>('all')

  useEffect(() => {
    setLoading(true)
    const q = band === 'all' ? '' : `?band=${band}`
    fetch(`/api/risk${q}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? [])
        if (d.distribution) setDistribution(d.distribution)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [band])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Risk Scoring & Recovery Prediction</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          In-house rules-based risk model + heuristic recovery strategy recommendations.
          Replace with an external model/credit-bureau API once credentials are supplied.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(['Critical', 'High', 'Medium', 'Low'] as RiskBand[]).map((b) => (
          <div key={b} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{b} risk</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{distribution[b]}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {BANDS.map((b) => (
          <button
            key={b}
            onClick={() => setBand(b)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium ${
              band === b ? 'bg-blue-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            {b === 'all' ? 'All' : b}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">No loans in this band.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-2 px-3">Loan No</th>
                <th className="py-2 px-3">Borrower</th>
                <th className="py-2 px-3">Outstanding</th>
                <th className="py-2 px-3">Score</th>
                <th className="py-2 px-3">Band</th>
                <th className="py-2 px-3">Pay prob.</th>
                <th className="py-2 px-3">Recommended strategy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.loanNo} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{r.loanNo}</td>
                  <td className="py-2 px-3">
                    {r.borrowerName}
                    {r.factors.length > 0 && (
                      <span className="block text-xs text-gray-400">{r.factors.slice(0, 2).join(' · ')}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">{formatKES(r.outstandingBalance)}</td>
                  <td className="py-2 px-3 font-medium">{r.score}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BAND_COLORS[r.band]}`}>{r.band}</span>
                  </td>
                  <td className="py-2 px-3">{r.paymentProbability}%</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{r.recommendedStrategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
