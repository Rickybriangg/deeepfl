'use client'
import { useEffect, useState } from 'react'

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [secret, setSecret] = useState('')
  const [otpauthUri, setOtpauthUri] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function loadStatus() {
    fetch('/api/mfa')
      .then((r) => r.json())
      .then((d) => {
        setMfaEnabled(!!d.mfaEnabled)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(loadStatus, [])

  async function beginEnrollment() {
    setBusy(true)
    setError('')
    const res = await fetch('/api/mfa', { method: 'POST' })
    const d = await res.json()
    setSecret(d.secret)
    setOtpauthUri(d.otpauthUri)
    setEnrolling(true)
    setBusy(false)
  }

  async function confirm(action: 'enable' | 'disable') {
    setBusy(true)
    setError('')
    const res = await fetch('/api/mfa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    })
    setBusy(false)
    if (!res.ok) {
      setError('Invalid code. Check your authenticator app and try again.')
      return
    }
    setToken('')
    setEnrolling(false)
    setSecret('')
    loadStatus()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Security</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage two-factor authentication for your account</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Two-Factor Authentication (TOTP)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {loading
                ? 'Loading…'
                : mfaEnabled
                ? 'Enabled — a code from your authenticator app is required at sign-in.'
                : 'Disabled — add an authenticator app for an extra layer of security.'}
            </p>
          </div>
          {!loading && !enrolling && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${mfaEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {mfaEnabled ? 'On' : 'Off'}
            </span>
          )}
        </div>

        {!loading && !enrolling && (
          <div className="mt-4">
            {mfaEnabled ? (
              <button onClick={beginEnrollment} disabled={busy} className="text-sm border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                Disable 2FA
              </button>
            ) : (
              <button onClick={beginEnrollment} disabled={busy} className="text-sm bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg">
                {busy ? 'Starting…' : 'Set up 2FA'}
              </button>
            )}
          </div>
        )}

        {enrolling && (
          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
            {!mfaEnabled && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Add this secret to your authenticator app (Google Authenticator, Authy, 1Password…), then enter the
                  6-digit code it shows to confirm.
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono text-sm break-all">{secret}</div>
                <p className="text-xs text-gray-400 break-all">{otpauthUri}</p>
              </>
            )}
            {mfaEnabled && (
              <p className="text-sm text-gray-600 dark:text-gray-300">Enter a current code to confirm disabling 2FA.</p>
            )}
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              className="w-40 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 tracking-widest"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => confirm(mfaEnabled ? 'disable' : 'enable')}
                disabled={busy || token.length < 6}
                className="text-sm bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
              >
                {busy ? 'Verifying…' : mfaEnabled ? 'Confirm disable' : 'Verify & enable'}
              </button>
              <button onClick={() => { setEnrolling(false); setError(''); setToken('') }} className="text-gray-600 dark:text-gray-300 text-sm px-4 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
