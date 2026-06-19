'use client'
import { useEffect, useState } from 'react'

interface Rule {
  id: string
  level: number
  label: string
  minDaysInArrears: number
  maxDaysInArrears: number | null
  action: string
  enabled: boolean
}

const ACTIONS = ['notify', 'assign_officer', 'escalate_supervisor', 'escalate_legal']

export default function AutomationPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingLevel, setSavingLevel] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/automation-rules')
      .then((r) => r.json())
      .then((d) => {
        setRules(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function save(rule: Rule) {
    setSavingLevel(rule.level)
    const res = await fetch('/api/automation-rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    })
    if (res.ok) {
      const updated = await res.json()
      setRules((prev) => prev.map((r) => (r.level === updated.level ? updated : r)))
    }
    setSavingLevel(null)
  }

  function updateField<K extends keyof Rule>(level: number, key: K, value: Rule[K]) {
    setRules((prev) => prev.map((r) => (r.level === level ? { ...r, [key]: value } : r)))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collection Workflow Automation</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure the days-in-arrears thresholds and actions for each automation level. Applied
          daily by the workflow automation cron job.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3">Level</th>
                <th className="py-2 px-3">Label</th>
                <th className="py-2 px-3">Min Days</th>
                <th className="py-2 px-3">Max Days</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Enabled</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.level} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-medium">{r.level}</td>
                  <td className="py-2 px-3">
                    <input
                      value={r.label}
                      onChange={(e) => updateField(r.level, 'label', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 w-48"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={r.minDaysInArrears}
                      onChange={(e) => updateField(r.level, 'minDaysInArrears', Number(e.target.value))}
                      className="border border-gray-300 rounded-lg px-2 py-1 w-20"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={r.maxDaysInArrears ?? ''}
                      placeholder="∞"
                      onChange={(e) =>
                        updateField(r.level, 'maxDaysInArrears', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="border border-gray-300 rounded-lg px-2 py-1 w-20"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={r.action}
                      onChange={(e) => updateField(r.level, 'action', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1"
                    >
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => updateField(r.level, 'enabled', e.target.checked)}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => save(r)}
                      disabled={savingLevel === r.level}
                      className="text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
                    >
                      {savingLevel === r.level ? 'Saving…' : 'Save'}
                    </button>
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
