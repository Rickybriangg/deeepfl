'use client'
import { useEffect, useState } from 'react'

interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  before: string | null
  after: string | null
  timestamp: string
  actor: { name: string }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [entity])

  const entities = Array.from(new Set(logs.map((l) => l.entity)))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete trail of recovery actions, system changes, and escalations
          </p>
        </div>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
        >
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No audit events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3">When</th>
                <th className="py-2 px-3">Actor</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Entity</th>
                <th className="py-2 px-3">Before → After</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 whitespace-nowrap text-gray-500">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">{l.actor.name}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {l.entity}
                    {l.entityId ? ` · ${l.entityId}` : ''}
                  </td>
                  <td className="py-2 px-3 text-gray-500 max-w-md truncate">
                    {l.before ?? '—'} → {l.after ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
