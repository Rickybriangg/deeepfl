'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatKES } from '@/lib/format'

interface TargetRow {
  officerId: string
  officerName: string
  period: string
  targetAmount: string | null
  actualAmount: number
}

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function TargetsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = role === 'Admin' || role === 'Manager' || role === 'Superadmin'

  const [period, setPeriod] = useState(currentPeriod())
  const [rows, setRows] = useState<TargetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function load() {
    setLoading(true)
    fetch(`/api/recovery-targets?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [period])

  async function save(officerId: string) {
    await fetch('/api/recovery-targets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officerId, period, targetAmount: draft }),
    })
    setEditing(null)
    setDraft('')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recovery Targets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-officer monthly collection targets vs. actual</p>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No officers found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3">Officer</th>
                <th className="py-2 px-3">Target</th>
                <th className="py-2 px-3">Actual</th>
                <th className="py-2 px-3">% Achieved</th>
                {canEdit && <th className="py-2 px-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const target = r.targetAmount ? Number(r.targetAmount) : null
                const pct = target && target > 0 ? Math.round((r.actualAmount / target) * 100) : null
                return (
                  <tr key={r.officerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{r.officerName}</td>
                    <td className="py-2 px-3">
                      {editing === r.officerId ? (
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 w-32"
                        />
                      ) : r.targetAmount ? (
                        formatKES(r.targetAmount)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 px-3">{formatKES(String(r.actualAmount))}</td>
                    <td className="py-2 px-3">
                      {pct !== null ? (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {pct}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-2 px-3">
                        {editing === r.officerId ? (
                          <div className="flex gap-2">
                            <button onClick={() => save(r.officerId)} className="text-blue-700 text-xs font-medium">Save</button>
                            <button onClick={() => setEditing(null)} className="text-gray-500 text-xs">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditing(r.officerId)
                              setDraft(r.targetAmount ?? '')
                            }}
                            className="text-blue-700 text-xs font-medium"
                          >
                            Set target
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
