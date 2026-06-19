'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface IntegrationField {
  key: string
  label: string
}

interface Integration {
  key: string
  label: string
  fields: IntegrationField[]
  configured: boolean
  lastVerifiedAt: string | null
}

export default function IntegrationsSettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/settings/integrations')
      .then((r) => r.json())
      .then((d) => {
        setIntegrations(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  if (role && role !== 'Superadmin') {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <p className="text-gray-500 text-sm">This page is restricted to Superadmin.</p>
      </div>
    )
  }

  async function save(key: string) {
    setBusyKey(key)
    await fetch('/api/settings/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, values }),
    })
    setOpen(null)
    setValues({})
    setBusyKey(null)
    load()
  }

  async function test(key: string) {
    setBusyKey(key)
    await fetch('/api/settings/integrations/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    setBusyKey(null)
    load()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings — Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Superadmin only. Credentials are encrypted at rest and never shown back in plaintext.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading…</p>
        ) : (
          integrations.map((i) => (
            <div key={i.key} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{i.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {i.configured ? (
                      <span className="text-green-700">
                        Configured
                        {i.lastVerifiedAt ? ` · verified ${new Date(i.lastVerifiedAt).toLocaleString()}` : ' · not yet verified'}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not configured</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {i.configured && (
                    <button
                      onClick={() => test(i.key)}
                      disabled={busyKey === i.key}
                      className="text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-3 py-1.5 rounded-lg"
                    >
                      Test connection
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setOpen(open === i.key ? null : i.key)
                      setValues({})
                    }}
                    className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg"
                  >
                    {i.configured ? 'Edit' : 'Configure'}
                  </button>
                </div>
              </div>

              {open === i.key && (
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                  {i.fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input
                        type="password"
                        value={values[f.key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => save(i.key)}
                    disabled={busyKey === i.key}
                    className="text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg mt-2"
                  >
                    {busyKey === i.key ? 'Saving…' : 'Save credentials'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
