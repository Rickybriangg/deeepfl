'use client'
import { useEffect, useMemo, useState } from 'react'
import { KpiCard } from '@/components/KpiCard'
import { formatKES, formatKESCompact, formatPercent, formatNumber } from '@/lib/format'
import { getCountyName } from '@/lib/counties'

const PRODUCT = 'Group Loan'
const PAGE_SIZE = 25

interface Officer {
  name: string
}
interface RecoveryCase {
  status: string
  officer?: Officer | null
}
interface Loan {
  id: string
  loanNo: string
  memberNo: string | null
  borrowerName: string
  countyCode: number | null
  branch: string | null
  disbursedAmount: string
  totalPaid: string
  outstandingBalance: string
  daysInArrears: number
  classification: string
  arrearsBucket: string | null
  recoveryTier: string | null
  recoveryCase?: RecoveryCase | null
}

interface Analytics {
  totalOutstanding: string
  totalOverdue?: string
  totalAccounts: number
  recoveryRate: number | null
  nplRatio: number | null
  par30: number | null
  defaultRate?: number | null
}

const CLASS_STYLES: Record<string, string> = {
  Normal: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Watch: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  Substandard: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Doubtful: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Loss: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function GroupBookPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loans, setLoans] = useState<Loan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Debounce the search box so we don't hit the API on every keystroke; a new
  // search always returns to the first page.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetch(`/api/analytics?product=${encodeURIComponent(PRODUCT)}`)
      .then((r) => r.json())
      .then((d) => setAnalytics(d))
      .catch(() => setAnalytics(null))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const params = new URLSearchParams({
        product: PRODUCT,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (query) params.set('search', query)
      try {
        const res = await fetch(`/api/loans?${params}`)
        const d = await res.json()
        if (cancelled) return
        setLoans(d.loans ?? [])
        setTotal(d.total ?? 0)
      } catch {
        if (cancelled) return
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, query])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  const hasBook = analytics && analytics.totalAccounts > 0

  const emptyState = useMemo(
    () => !loading && loans.length === 0,
    [loading, loans.length]
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Group Loan Book</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            The full Group Loan portfolio book — every group account with its recovery position
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loan no, borrower or member no…"
          className="w-full sm:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard
          title="Group Accounts"
          value={analytics ? formatNumber(analytics.totalAccounts) : '—'}
          subtitle="Loans"
          accent="purple"
        />
        <KpiCard
          title="Outstanding"
          value={analytics ? formatKESCompact(analytics.totalOutstanding) : '—'}
          subtitle="KES"
          accent="blue"
        />
        <KpiCard
          title="Overdue"
          value={analytics ? formatKESCompact(analytics.totalOverdue ?? '0') : '—'}
          subtitle="KES"
          accent="red"
        />
        <KpiCard
          title="Recovery Rate"
          value={analytics ? formatPercent(analytics.recoveryRate) : '—'}
          subtitle="Lifetime"
          accent="green"
        />
        <KpiCard
          title="NPL Ratio"
          value={analytics ? formatPercent(analytics.nplRatio) : '—'}
          subtitle="Non-performing"
          accent="red"
        />
        <KpiCard
          title="PAR > 30"
          value={analytics ? formatPercent(analytics.par30) : '—'}
          subtitle="Portfolio at risk"
          accent="amber"
        />
      </div>

      {!hasBook && !loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">No group loans</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            No Group Loan accounts are present in the current loan book. Import data that includes
            group products to populate this page.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">Loan / Borrower</th>
                  <th className="px-4 py-3 hidden md:table-cell">County</th>
                  <th className="px-4 py-3 text-right">Disbursed</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Arrears</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {emptyState ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      {query ? 'No group loans match your search.' : 'No group loans found.'}
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{loan.borrowerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{loan.loanNo}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-300">
                        {getCountyName(loan.countyCode)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                        {formatKES(loan.disbursedAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatKES(loan.outstandingBalance)}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={loan.daysInArrears > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400'}>
                          {loan.daysInArrears > 0 ? `${formatNumber(loan.daysInArrears)}d` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            CLASS_STYLES[loan.classification] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {loan.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-300">
                        {loan.recoveryCase?.officer?.name ?? <span className="text-gray-400">Unassigned</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
            <p className="text-gray-500 dark:text-gray-400">
              {loading ? 'Loading…' : `${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(total)}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <span className="text-gray-500 dark:text-gray-400">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
