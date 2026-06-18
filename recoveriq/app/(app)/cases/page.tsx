'use client'
import { useEffect, useState } from 'react'
import { formatKES } from '@/lib/format'

interface Action {
  id: string
  type: string
  outcome: string | null
  notes: string | null
  timestamp: string
}

interface Case {
  id: string
  loanNo: string
  status: string
  nextActionDate: string | null
  loan: { borrowerName: string; outstandingBalance: string; product: string }
  officer: { name: string } | null
  actions: Action[]
}

const STATUSES = [
  'New', 'In progress', 'Promised to pay', 'Restructured', 'Legal',
  'CRB-listed', 'Written-off', 'Recovered', 'Closed',
]
const ACTION_TYPES = [
  'Call', 'SMS', 'Demand letter', 'Field visit', 'Restructure offer',
  'Guarantor contact', 'CRB listing', 'Legal', 'Payment received', 'Note',
]

export default function CasesPage() {
  const [view, setView] = useState<'all' | 'mine' | 'dueToday'>('mine')
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Case | null>(null)
  const [form, setForm] = useState({ type: 'Call', outcome: '', notes: '', newStatus: '' })

  function load() {
    setLoading(true)
    const v = view === 'all' ? '' : view
    fetch(`/api/cases?view=${v}`)
      .then((r) => r.json())
      .then((d) => {
        setCases(d.cases ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [view])

  async function logAction() {
    if (!active) return
    await fetch(`/api/cases/${active.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.type,
        outcome: form.outcome || undefined,
        notes: form.notes || undefined,
        newStatus: form.newStatus || undefined,
      }),
    })
    setForm({ type: 'Call', outcome: '', notes: '', newStatus: '' })
    setActive(null)
    load()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recovery case lifecycle & action log</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['mine', 'dueToday', 'all'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium ${
              view === v ? 'bg-blue-700 text-white' : 'bg-white border border-gray-300 text-gray-600'
            }`}
          >
            {v === 'mine' ? 'My queue' : v === 'dueToday' ? 'Due today' : 'All cases'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading…</p>
        ) : cases.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No cases in this view.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3">Loan No</th>
                <th className="py-2 px-3">Borrower</th>
                <th className="py-2 px-3">Outstanding</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Officer</th>
                <th className="py-2 px-3">Next Action</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{c.loanNo}</td>
                  <td className="py-2 px-3">{c.loan.borrowerName}</td>
                  <td className="py-2 px-3">{formatKES(c.loan.outstandingBalance)}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.status}</span>
                  </td>
                  <td className="py-2 px-3">{c.officer?.name ?? '—'}</td>
                  <td className="py-2 px-3">{c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => setActive(c)} className="text-blue-700 text-xs font-medium">Log action</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActive(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">{active.loanNo} — {active.loan.borrowerName}</h3>
            <p className="text-xs text-gray-500 mb-4">Recent history: {active.actions.map((a) => a.type).join(', ') || 'none'}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5">
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
                <input value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Update status</label>
                <select value={form.newStatus} onChange={(e) => setForm((f) => ({ ...f, newStatus: e.target.value }))} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5">
                  <option value="">— keep current —</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={logAction} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
              <button onClick={() => setActive(null)} className="text-gray-600 text-sm px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
