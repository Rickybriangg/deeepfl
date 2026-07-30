'use client'
import { useEffect, useMemo, useState } from 'react'
import { formatNumber } from '@/lib/format'

interface User {
  id: string
  name: string
  email: string
  role: string
}

// Accent per role, least → most privileged.
const ROLE_STYLES: Record<string, string> = {
  Superadmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Manager: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Officer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

// Deterministic avatar tint from the name so each user reads distinctly.
const AVATAR_TINTS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
]
function tintFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_TINTS[h % AVATAR_TINTS.length]
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/users')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setError(true))
  }, [])

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const u of users ?? []) counts[u.role] = (counts[u.role] ?? 0) + 1
    return counts
  }, [users])

  const filtered = useMemo(() => {
    if (!users) return []
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {users ? `${formatNumber(users.length)} team member${users.length === 1 ? '' : 's'} with system access` : 'Loading team…'}
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or role…"
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      {/* Role summary chips */}
      {users && users.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(roleCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([role, count]) => (
              <span
                key={role}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLES[role] ?? ROLE_STYLES.Viewer}`}
              >
                {role}
                <span className="font-bold">{count}</span>
              </span>
            ))}
        </div>
      )}

      {error ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-red-300 dark:border-red-800 p-12 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">Could not load users. Please refresh.</p>
        </div>
      ) : !users ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400">Loading users…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {query ? 'No users match your search.' : 'No users found.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold shrink-0 ${tintFor(u.name)}`}
                      >
                        {initials(u.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLES[u.role] ?? ROLE_STYLES.Viewer}`}
                    >
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
