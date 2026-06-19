'use client'
import { useEffect, useState } from 'react'

interface LegalCase {
  id: string
  caseId: string
  type: string
  status: string
  lawyerName: string | null
  courtName: string | null
  filingDate: string | null
  hearingDate: string | null
  resolutionDate: string | null
  notes: string | null
  documentRef: string | null
  case: { loanNo: string; loan: { borrowerName: string } }
}

interface CaseOption {
  id: string
  loanNo: string
  loan: { borrowerName: string }
}

const TYPES = ['Demand Letter', 'Legal Notice', 'Court Case', 'Asset Repossession']
const STATUSES = ['Draft', 'Sent', 'Filed', 'In court', 'Resolved', 'Closed']

export default function LegalPage() {
  const [legalCases, setLegalCases] = useState<LegalCase[]>([])
  const [caseOptions, setCaseOptions] = useState<CaseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<LegalCase | null>(null)
  const [form, setForm] = useState({
    caseId: '', type: 'Demand Letter', lawyerName: '', courtName: '',
    filingDate: '', hearingDate: '', notes: '', documentRef: '',
  })

  function load() {
    setLoading(true)
    fetch('/api/legal')
      .then((r) => r.json())
      .then((d) => {
        setLegalCases(d.legalCases ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    fetch('/api/cases?view=all')
      .then((r) => r.json())
      .then((d) => setCaseOptions(d.cases ?? []))
  }, [])

  async function createLegalCase() {
    if (!form.caseId) return
    await fetch('/api/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowNew(false)
    setForm({ caseId: '', type: 'Demand Letter', lawyerName: '', courtName: '', filingDate: '', hearingDate: '', notes: '', documentRef: '' })
    load()
  }

  async function saveEdit() {
    if (!editing) return
    await fetch(`/api/legal/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    setEditing(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Legal Recovery</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Demand letters, notices, court cases & asset repossessions</p>
        </div>
        <button onClick={() => setShowNew(true)} className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg">
          New legal action
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">Loading…</p>
        ) : legalCases.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">No legal actions logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-2 px-3">Loan No</th>
                <th className="py-2 px-3">Borrower</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Lawyer</th>
                <th className="py-2 px-3">Court</th>
                <th className="py-2 px-3">Hearing date</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {legalCases.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{l.case.loanNo}</td>
                  <td className="py-2 px-3">{l.case.loan.borrowerName}</td>
                  <td className="py-2 px-3">{l.type}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{l.status}</span>
                  </td>
                  <td className="py-2 px-3">{l.lawyerName ?? '—'}</td>
                  <td className="py-2 px-3">{l.courtName ?? '—'}</td>
                  <td className="py-2 px-3">{l.hearingDate ? new Date(l.hearingDate).toLocaleDateString() : '—'}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => setEditing(l)} className="text-blue-700 text-xs font-medium">Update</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">New legal action</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Case</label>
                <select value={form.caseId} onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5">
                  <option value="">— select a case —</option>
                  {caseOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.loanNo} — {c.loan.borrowerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Lawyer</label>
                <input value={form.lawyerName} onChange={(e) => setForm((f) => ({ ...f, lawyerName: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Court</label>
                <input value={form.courtName} onChange={(e) => setForm((f) => ({ ...f, courtName: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Filing date</label>
                <input type="date" value={form.filingDate} onChange={(e) => setForm((f) => ({ ...f, filingDate: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Hearing date</label>
                <input type="date" value={form.hearingDate} onChange={(e) => setForm((f) => ({ ...f, hearingDate: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Document reference (URL or filing no.)</label>
                <input value={form.documentRef} onChange={(e) => setForm((f) => ({ ...f, documentRef: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={createLegalCase} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Create</button>
              <button onClick={() => setShowNew(false)} className="text-gray-600 dark:text-gray-300 text-sm px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{editing.case.loanNo} — {editing.type}</h3>
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing((c) => c && { ...c, status: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Lawyer</label>
                <input value={editing.lawyerName ?? ''} onChange={(e) => setEditing((c) => c && { ...c, lawyerName: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Court</label>
                <input value={editing.courtName ?? ''} onChange={(e) => setEditing((c) => c && { ...c, courtName: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Hearing date</label>
                <input type="date" value={editing.hearingDate ? editing.hearingDate.slice(0, 10) : ''} onChange={(e) => setEditing((c) => c && { ...c, hearingDate: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Resolution date</label>
                <input type="date" value={editing.resolutionDate ? editing.resolutionDate.slice(0, 10) : ''} onChange={(e) => setEditing((c) => c && { ...c, resolutionDate: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Document reference</label>
                <input value={editing.documentRef ?? ''} onChange={(e) => setEditing((c) => c && { ...c, documentRef: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={editing.notes ?? ''} onChange={(e) => setEditing((c) => c && { ...c, notes: e.target.value })} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveEdit} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Save</button>
              <button onClick={() => setEditing(null)} className="text-gray-600 dark:text-gray-300 text-sm px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
