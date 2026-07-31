'use client'
import { useEffect, useMemo, useState } from 'react'
import { formatKES, formatNumber } from '@/lib/format'

interface TemplateCount {
  policies: number
}
interface Template {
  id: string
  name: string
  provider: string | null
  coverageType: string
  coverageBasis: string
  coveragePercent: string
  premiumRate: string
  termMonths: number | null
  description: string | null
  enabled: boolean
  _count?: TemplateCount
}
interface Option {
  value: string
  label: string
}
interface Policy {
  id: string
  loanNo: string
  policyNo: string
  status: string
  insuredAmount: string
  premiumAmount: string
  coverageBasis: string
  coveragePercent: string
  premiumRate: string
  startDate: string
  endDate: string | null
  template?: { name: string; coverageType: string } | null
  loan?: { borrowerName: string; product: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  lapsed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  claimed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

const emptyForm = {
  name: '',
  provider: '',
  coverageType: 'credit-life',
  coverageBasis: 'outstanding',
  coveragePercent: '100',
  premiumRate: '1',
  termMonths: '',
  description: '',
}

export default function InsurancePage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [types, setTypes] = useState<Option[]>([])
  const [bases, setBases] = useState<Option[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [insureLoanNo, setInsureLoanNo] = useState('')
  const [insureTemplateId, setInsureTemplateId] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  function loadTemplates() {
    fetch('/api/insurance/templates')
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? [])
        setTypes(d.coverageTypes ?? [])
        setBases(d.coverageBases ?? [])
        if (!insureTemplateId && d.templates?.[0]) setInsureTemplateId(d.templates[0].id)
      })
      .catch(() => setMessage({ kind: 'err', text: 'Could not load templates.' }))
  }

  function loadPolicies() {
    fetch('/api/insurance/policies')
      .then((r) => r.json())
      .then((d) => setPolicies(d.policies ?? []))
      .catch(() => setPolicies([]))
  }

  useEffect(() => {
    loadTemplates()
    loadPolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const typeLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of types) m[t.value] = t.label
    return m
  }, [types])
  const basisLabel = useMemo(() => {
    const m: Record<string, string> = {}
    for (const b of bases) m[b.value] = b.label
    return m
  }, [bases])

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/insurance/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          provider: form.provider || null,
          coverageType: form.coverageType,
          coverageBasis: form.coverageBasis,
          coveragePercent: form.coveragePercent,
          premiumRate: form.premiumRate,
          termMonths: form.termMonths ? Number(form.termMonths) : null,
          description: form.description || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.formErrors?.[0] ?? err.error ?? 'Could not create template')
      }
      setForm({ ...emptyForm })
      setMessage({ kind: 'ok', text: 'Template created.' })
      loadTemplates()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleTemplate(t: Template) {
    await fetch('/api/insurance/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, enabled: !t.enabled }),
    })
    loadTemplates()
  }

  async function insureLoan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/insurance/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanNo: insureLoanNo.trim(), templateId: insureTemplateId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.formErrors?.[0] ?? err.error ?? 'Could not insure loan')
      }
      const policy = await res.json()
      setInsureLoanNo('')
      setMessage({ kind: 'ok', text: `Loan insured — policy ${policy.policyNo}.` })
      loadPolicies()
      loadTemplates()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Loan Insurance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Define insurance templates and insure loans against them
        </p>
      </div>

      {message && (
        <div
          className={`mb-5 rounded-lg px-4 py-3 text-sm ${
            message.kind === 'ok'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* New template form */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">New template</h2>
          <form onSubmit={createTemplate} className="space-y-3">
            <input
              required
              placeholder="Template name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
            <input
              placeholder="Provider / underwriter (optional)"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className={inputCls}
            />
            <select
              value={form.coverageType}
              onChange={(e) => setForm({ ...form, coverageType: e.target.value })}
              className={inputCls}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={form.coverageBasis}
              onChange={(e) => setForm({ ...form, coverageBasis: e.target.value })}
              className={inputCls}
            >
              {bases.map((b) => (
                <option key={b.value} value={b.value}>Basis: {b.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Coverage %
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={form.coveragePercent}
                  onChange={(e) => setForm({ ...form, coveragePercent: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Premium %
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={form.premiumRate}
                  onChange={(e) => setForm({ ...form, premiumRate: e.target.value })}
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block">
              Term (months, optional)
              <input
                type="number" min="1"
                value={form.termMonths}
                onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
                className={`${inputCls} mt-1`}
              />
            </label>
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Create template
            </button>
          </form>
        </div>

        {/* Templates list + insure form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Insure a loan</h2>
            <form onSubmit={insureLoan} className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[160px] text-xs text-gray-500 dark:text-gray-400">
                Loan number
                <input
                  required
                  placeholder="e.g. GRP12345"
                  value={insureLoanNo}
                  onChange={(e) => setInsureLoanNo(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="flex-1 min-w-[180px] text-xs text-gray-500 dark:text-gray-400">
                Template
                <select
                  value={insureTemplateId}
                  onChange={(e) => setInsureTemplateId(e.target.value)}
                  className={`${inputCls} mt-1`}
                >
                  {templates.filter((t) => t.enabled).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={saving || templates.length === 0}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Insure
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Templates</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {templates.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">No templates yet.</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {t.name}
                        {t.provider ? <span className="text-gray-400 font-normal"> · {t.provider}</span> : null}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {typeLabel[t.coverageType] ?? t.coverageType} · {t.coveragePercent}% of {basisLabel[t.coverageBasis] ?? t.coverageBasis} · {t.premiumRate}% premium
                        {t._count ? ` · ${formatNumber(t._count.policies)} ${t._count.policies === 1 ? 'policy' : 'policies'}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleTemplate(t)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                        t.enabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {t.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Policies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-5 py-3">Policy</th>
                <th className="px-5 py-3">Loan</th>
                <th className="px-5 py-3">Cover</th>
                <th className="px-5 py-3 text-right">Insured</th>
                <th className="px-5 py-3 text-right">Premium</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    No loans insured yet.
                  </td>
                </tr>
              ) : (
                policies.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{p.policyNo}</td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900 dark:text-gray-100">{p.loan?.borrowerName ?? p.loanNo}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{p.loanNo}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {p.template?.name ?? '—'}
                      <span className="text-gray-400"> · {p.coveragePercent}%</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatKES(p.insuredAmount)}</td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{formatKES(p.premiumAmount)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status] ?? STATUS_STYLES.cancelled}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
