'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatKES } from '@/lib/format'

interface Action {
  id: string
  type: string
  outcome: string | null
  notes: string | null
  amountReceived?: string | null
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
  isBrokenPromise?: boolean
}

interface Installment {
  id: string
  dueDate: string
  amount: string
  status: 'Pending' | 'Paid' | 'Overdue'
  paidDate: string | null
  paidAmount: string | null
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
  return (
    <Suspense fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}>
      <CasesPageInner />
    </Suspense>
  )
}

function CasesPageInner() {
  const searchParams = useSearchParams()
  const initialView = searchParams.get('view')
  const [view, setView] = useState<'all' | 'mine' | 'dueToday' | 'brokenPTP'>(
    initialView === 'brokenPTP' || initialView === 'dueToday' || initialView === 'all'
      ? initialView
      : 'mine'
  )
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Case | null>(null)
  const [form, setForm] = useState({
    type: 'Call',
    outcome: '',
    notes: '',
    newStatus: '',
    amountPromised: '',
    nextActionDate: '',
  })
  const [tab, setTab] = useState<'action' | 'installments'>('action')
  const [installments, setInstallments] = useState<Installment[]>([])
  const [newInstallment, setNewInstallment] = useState({ dueDate: '', amount: '' })

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
        amountPromised: form.amountPromised || undefined,
        nextActionDate: form.nextActionDate || undefined,
      }),
    })
    setForm({ type: 'Call', outcome: '', notes: '', newStatus: '', amountPromised: '', nextActionDate: '' })
    setActive(null)
    load()
  }

  function openCase(c: Case) {
    setActive(c)
    setTab('action')
    loadInstallments(c.id)
  }

  function loadInstallments(caseId: string) {
    fetch(`/api/cases/${caseId}/installments`)
      .then((r) => r.json())
      .then((d) => setInstallments(d.installments ?? []))
      .catch(() => setInstallments([]))
  }

  async function addInstallment() {
    if (!active || !newInstallment.dueDate || !newInstallment.amount) return
    await fetch(`/api/cases/${active.id}/installments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInstallment),
    })
    setNewInstallment({ dueDate: '', amount: '' })
    loadInstallments(active.id)
  }

  async function markInstallment(id: string, status: Installment['status']) {
    if (!active) return
    await fetch(`/api/installments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadInstallments(active.id)
  }

  async function deleteInstallment(id: string) {
    if (!active) return
    await fetch(`/api/installments/${id}`, { method: 'DELETE' })
    loadInstallments(active.id)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cases</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Recovery case lifecycle & action log</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['mine', 'dueToday', 'brokenPTP', 'all'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium ${
              view === v ? 'bg-blue-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            {v === 'mine'
              ? 'My queue'
              : v === 'dueToday'
              ? 'Due today'
              : v === 'brokenPTP'
              ? 'Broken promises'
              : 'All cases'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">Loading…</p>
        ) : cases.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">No cases in this view.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left text-gray-500 dark:text-gray-400">
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
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{c.loanNo}</td>
                  <td className="py-2 px-3">{c.loan.borrowerName}</td>
                  <td className="py-2 px-3">{formatKES(c.loan.outstandingBalance)}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.status}</span>
                    {c.isBrokenPromise && (
                      <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Broken promise
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">{c.officer?.name ?? '—'}</td>
                  <td className="py-2 px-3">{c.nextActionDate ? new Date(c.nextActionDate).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => openCase(c)} className="text-blue-700 text-xs font-medium">Log action</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActive(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{active.loanNo} — {active.loan.borrowerName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent history: {active.actions.map((a) => a.type).join(', ') || 'none'}</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('action')}
                className={`text-xs px-3 py-1 rounded-full font-medium ${tab === 'action' ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              >
                Log action
              </button>
              <button
                onClick={() => setTab('installments')}
                className={`text-xs px-3 py-1 rounded-full font-medium ${tab === 'installments' ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              >
                Installment schedule
              </button>
            </div>

            {tab === 'installments' ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {installments.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No installments entered yet.</p>
                ) : (
                  installments.map((i) => (
                    <div key={i.id} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                      <div className="text-xs">
                        <span className="font-medium">{new Date(i.dueDate).toLocaleDateString()}</span>
                        {' · '}
                        {formatKES(i.amount)}
                        <span
                          className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            i.status === 'Paid'
                              ? 'bg-green-100 text-green-700'
                              : i.status === 'Overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {i.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {i.status !== 'Paid' && (
                          <button onClick={() => markInstallment(i.id, 'Paid')} className="text-green-700 text-[11px] font-medium">
                            Mark paid
                          </button>
                        )}
                        {i.status !== 'Pending' && (
                          <button onClick={() => markInstallment(i.id, 'Pending')} className="text-gray-500 text-[11px] font-medium">
                            Reset
                          </button>
                        )}
                        <button onClick={() => deleteInstallment(i.id)} className="text-red-600 text-[11px] font-medium">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div className="flex gap-2 pt-2">
                  <input
                    type="date"
                    value={newInstallment.dueDate}
                    onChange={(e) => setNewInstallment((f) => ({ ...f, dueDate: e.target.value }))}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 flex-1"
                  />
                  <input
                    placeholder="Amount"
                    value={newInstallment.amount}
                    onChange={(e) => setNewInstallment((f) => ({ ...f, amount: e.target.value }))}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 w-24"
                  />
                  <button onClick={addInstallment} className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg">
                    Add
                  </button>
                </div>
                <button onClick={() => setActive(null)} className="text-gray-600 dark:text-gray-300 text-sm pt-2">Close</button>
              </div>
            ) : (
              <>
            {active.actions.some((a) => a.type === 'Payment received') && (
              <div className="mb-4 space-y-1">
                {active.actions
                  .filter((a) => a.type === 'Payment received')
                  .map((a) => (
                    <a
                      key={a.id}
                      href={`/api/payments/${a.id}/receipt`}
                      className="block text-xs text-blue-700 hover:underline"
                    >
                      ↓ Receipt — {new Date(a.timestamp).toLocaleDateString()}
                      {a.amountReceived ? ` · ${a.amountReceived}` : ''}
                    </a>
                  ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Action type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5">
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Outcome</label>
                <input value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Update status</label>
                <select value={form.newStatus} onChange={(e) => setForm((f) => ({ ...f, newStatus: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5">
                  <option value="">— keep current —</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.newStatus === 'Promised to pay' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Amount promised (KES)</label>
                  <input value={form.amountPromised} onChange={(e) => setForm((f) => ({ ...f, amountPromised: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
                </div>
              )}
              {(form.newStatus === 'Promised to pay' || form.type === 'Field visit') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    {form.type === 'Field visit' && form.newStatus !== 'Promised to pay' ? 'Scheduled visit date' : 'Commitment date'}
                  </label>
                  <input type="date" value={form.nextActionDate} onChange={(e) => setForm((f) => ({ ...f, nextActionDate: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={logAction} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
              <button onClick={() => setActive(null)} className="text-gray-600 dark:text-gray-300 text-sm px-4 py-2">Cancel</button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
