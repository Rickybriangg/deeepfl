'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatKES } from '@/lib/format'

interface Loan {
  id: string
  loanNo: string
  borrowerName: string
  product: string
  outstandingBalance: string
  daysInArrears: number
  classification: string
  recoveryTier: string | null
  arrearsBucket: string | null
  dormancyDays: number | null
  isMatured: boolean
  isCreditBalance: boolean
  recoveryCase: { status: string; officer: { name: string } | null } | null
}

interface User {
  id: string
  name: string
  role: string
}

const WORKLISTS = [
  { key: '', label: 'All accounts' },
  { key: 'doubtful', label: 'Doubtful tier' },
  { key: 'dormant365', label: 'Dormant 365+' },
  { key: 'matured', label: 'Matured & owing' },
  { key: 'creditBalances', label: 'Credit balances to reconcile' },
  { key: 'highestExposure', label: 'Highest exposure' },
]

export default function WatchlistPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
      <WatchlistPageInner />
    </Suspense>
  )
}

function WatchlistPageInner() {
  const searchParams = useSearchParams()
  const [worklist, setWorklist] = useState(searchParams.get('worklist') ?? '')
  const [loans, setLoans] = useState<Loan[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [officers, setOfficers] = useState<User[]>([])
  const [assignTo, setAssignTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => setOfficers((d.users ?? []).filter((u: User) => u.role === 'Officer')))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/loans?worklist=${worklist}&pageSize=100`)
      .then((r) => r.json())
      .then((d) => {
        setLoans(d.loans ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [worklist])

  function toggleAll() {
    if (selected.size === loans.length) setSelected(new Set())
    else setSelected(new Set(loans.map((l) => l.loanNo)))
  }

  function toggle(loanNo: string) {
    const next = new Set(selected)
    if (next.has(loanNo)) next.delete(loanNo)
    else next.add(loanNo)
    setSelected(next)
  }

  async function bulkAssign() {
    if (!assignTo || selected.size === 0) return
    const res = await fetch('/api/cases/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanNos: Array.from(selected), officerId: assignTo }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`Assigned ${data.assigned} accounts.`)
      setSelected(new Set())
    } else {
      setMessage('Assignment failed.')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
        <p className="text-sm text-gray-500 mt-0.5">Worklists, filters, and bulk assignment</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {WORKLISTS.map((w) => (
          <button
            key={w.key}
            onClick={() => setWorklist(w.key)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
              worklist === w.key ? 'bg-blue-700 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-sm text-blue-800 font-medium">{selected.size} selected</span>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1">
            <option value="">Assign to officer…</option>
            {officers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button onClick={bulkAssign} className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg">
            Assign
          </button>
        </div>
      )}

      {message && <p className="text-sm text-green-700 mb-3">{message}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading…</p>
        ) : loans.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No accounts match this worklist.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3"><input type="checkbox" checked={selected.size === loans.length} onChange={toggleAll} /></th>
                <th className="py-2 px-3">Loan No</th>
                <th className="py-2 px-3">Borrower</th>
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3">Outstanding</th>
                <th className="py-2 px-3">Arrears (days)</th>
                <th className="py-2 px-3">Tier</th>
                <th className="py-2 px-3">Case Status</th>
                <th className="py-2 px-3">Officer</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3"><input type="checkbox" checked={selected.has(loan.loanNo)} onChange={() => toggle(loan.loanNo)} /></td>
                  <td className="py-2 px-3 font-medium">{loan.loanNo}</td>
                  <td className="py-2 px-3">{loan.borrowerName}</td>
                  <td className="py-2 px-3">{loan.product}</td>
                  <td className="py-2 px-3">{formatKES(loan.outstandingBalance)}</td>
                  <td className="py-2 px-3">{loan.daysInArrears}</td>
                  <td className="py-2 px-3">{loan.recoveryTier ?? '—'}</td>
                  <td className="py-2 px-3">{loan.recoveryCase?.status ?? '—'}</td>
                  <td className="py-2 px-3">{loan.recoveryCase?.officer?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">{total} total accounts in this worklist</p>
    </div>
  )
}
