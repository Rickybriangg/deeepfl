'use client'
import { useEffect, useState } from 'react'

interface Rule {
  id: string
  level: number
  label: string
  minDaysInArrears: number
  maxDaysInArrears: number | null
  action: string
  assignmentStrategy: string
  enabled: boolean
}

const ASSIGNMENT_STRATEGIES = ['least_open_cases', 'branch_match']

interface RiskSettings {
  mediumMin: number
  highMin: number
  criticalMin: number
  strategyLow: string
  strategyMedium: string
  strategyHigh: string
  strategyCritical: string
}

const ACTIONS = ['notify', 'assign_officer', 'escalate_supervisor', 'escalate_legal']

export default function AutomationPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingLevel, setSavingLevel] = useState<number | null>(null)

  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null)
  const [savingRisk, setSavingRisk] = useState(false)

  useEffect(() => {
    fetch('/api/automation-rules')
      .then((r) => r.json())
      .then((d) => {
        setRules(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/risk-settings')
      .then((r) => r.json())
      .then((d) => setRiskSettings(d))
      .catch(() => {})
  }, [])

  function updateRiskField<K extends keyof RiskSettings>(key: K, value: RiskSettings[K]) {
    setRiskSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function saveRiskSettings() {
    if (!riskSettings) return
    setSavingRisk(true)
    const res = await fetch('/api/risk-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(riskSettings),
    })
    if (res.ok) setRiskSettings(await res.json())
    setSavingRisk(false)
  }

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Collection Workflow Automation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Configure the days-in-arrears thresholds and actions for each automation level. Applied
          daily by the workflow automation cron job.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-6">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-2 px-3">Level</th>
                <th className="py-2 px-3">Label</th>
                <th className="py-2 px-3">Min Days</th>
                <th className="py-2 px-3">Max Days</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Assignment strategy</th>
                <th className="py-2 px-3">Enabled</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.level} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 font-medium">{r.level}</td>
                  <td className="py-2 px-3">
                    <input
                      value={r.label}
                      onChange={(e) => updateField(r.level, 'label', e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-48"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={r.minDaysInArrears}
                      onChange={(e) => updateField(r.level, 'minDaysInArrears', Number(e.target.value))}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-20"
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
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-20"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={r.action}
                      onChange={(e) => updateField(r.level, 'action', e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1"
                    >
                      {ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    {r.action === 'assign_officer' ? (
                      <select
                        value={r.assignmentStrategy}
                        onChange={(e) => updateField(r.level, 'assignmentStrategy', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1"
                      >
                        {ASSIGNMENT_STRATEGIES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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

      <div className="mt-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Risk Thresholds & Recovery Strategies</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Configure the score cutoffs for each risk band and the recommended strategy shown on the Risk page,
          without touching code.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {!riskSettings ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 max-w-xl">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Medium min score</label>
                <input
                  type="number"
                  value={riskSettings.mediumMin}
                  onChange={(e) => updateRiskField('mediumMin', Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">High min score</label>
                <input
                  type="number"
                  value={riskSettings.highMin}
                  onChange={(e) => updateRiskField('highMin', Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Critical min score</label>
                <input
                  type="number"
                  value={riskSettings.criticalMin}
                  onChange={(e) => updateRiskField('criticalMin', Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-full"
                />
              </div>
            </div>

            {([
              ['strategyLow', 'Low risk strategy'],
              ['strategyMedium', 'Medium risk strategy'],
              ['strategyHigh', 'High risk strategy'],
              ['strategyCritical', 'Critical risk strategy'],
            ] as [keyof RiskSettings, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <input
                  value={riskSettings[key] as string}
                  onChange={(e) => updateRiskField(key, e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 w-full max-w-xl"
                />
              </div>
            ))}

            <button
              onClick={saveRiskSettings}
              disabled={savingRisk}
              className="text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
            >
              {savingRisk ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
