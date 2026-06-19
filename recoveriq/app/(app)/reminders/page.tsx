'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface Stage {
  key: string
  label: string
  offset: number
}

interface Template {
  id: string
  channel: string
  stage: string
  subject: string | null
  body: string
  enabled: boolean
}

interface ReminderLog {
  id: string
  loanNo: string
  channel: string
  stage: string
  status: string
  message: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  queued: 'bg-blue-100 text-blue-700',
  skipped: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-700',
}

export default function RemindersPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = role === 'Admin' || role === 'Manager' || role === 'Superadmin'

  const [stages, setStages] = useState<Stage[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [logs, setLogs] = useState<ReminderLog[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [tab, setTab] = useState<'templates' | 'log'>('templates')
  const [savingId, setSavingId] = useState<string | null>(null)

  function loadTemplates() {
    fetch('/api/reminder-templates')
      .then((r) => r.json())
      .then((d) => {
        setStages(d.stages ?? [])
        setTemplates(d.templates ?? [])
      })
  }
  function loadLog() {
    fetch('/api/reminders')
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? [])
        setSummary(d.summary ?? {})
      })
  }

  useEffect(() => {
    loadTemplates()
    loadLog()
  }, [])

  function updateField(id: string, key: keyof Template, value: string | boolean) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)))
  }

  async function save(t: Template) {
    setSavingId(t.id)
    await fetch('/api/reminder-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: t.channel, stage: t.stage, subject: t.subject, body: t.body, enabled: t.enabled }),
    })
    setSavingId(null)
  }

  const stageLabel = (key: string) => stages.find((s) => s.key === key)?.label ?? key

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reminder Engine</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Scheduled due-date reminders. Internal (CRM) reminders are delivered now; external channels
          (SMS, WhatsApp, Email, Push, Voice) are queued and start sending once their credentials are
          added in Settings → Integrations.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['templates', 'log'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-3 py-1.5 rounded-full font-medium ${
              tab === t ? 'bg-blue-700 text-white' : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            {t === 'templates' ? 'Templates' : 'Activity log'}
          </button>
        ))}
      </div>

      {tab === 'templates' ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-6">Loading…</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    <span className="uppercase text-xs text-gray-400 mr-2">{t.channel}</span>
                    {stageLabel(t.stage)}
                  </p>
                  <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <input type="checkbox" checked={t.enabled} disabled={!canEdit} onChange={(e) => updateField(t.id, 'enabled', e.target.checked)} />
                    Enabled
                  </label>
                </div>
                <textarea
                  value={t.body}
                  disabled={!canEdit}
                  onChange={(e) => updateField(t.id, 'body', e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 disabled:opacity-60"
                />
                {canEdit && (
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => save(t)} disabled={savingId === t.id} className="text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg">
                      {savingId === t.id ? 'Saving…' : 'Save'}
                    </button>
                    <span className="text-xs text-gray-400">Placeholders: {'{{name}} {{amount}} {{loanNo}} {{daysInArrears}}'}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <div className="flex gap-4 mb-4">
            {Object.entries(summary).map(([status, count]) => (
              <div key={status} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-6">No reminders generated yet. The daily cron populates this.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-2 px-3">When</th>
                    <th className="py-2 px-3">Loan No</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Stage</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 whitespace-nowrap text-gray-500 dark:text-gray-400">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-3 font-medium">{l.loanNo}</td>
                      <td className="py-2 px-3 uppercase text-xs">{l.channel}</td>
                      <td className="py-2 px-3">{stageLabel(l.stage)}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400 max-w-md truncate">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
