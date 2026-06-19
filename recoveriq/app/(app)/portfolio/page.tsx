'use client'
import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { formatKESCompact, formatPercent } from '@/lib/format'

interface Breakdown {
  [key: string]: { count: number; outstanding: string }
}

interface Analytics {
  totalOutstanding: string
  totalAccounts: number
  tierBreakdown: Breakdown
  classificationBreakdown: Breakdown
  arrearsBreakdown: Breakdown
  countyBreakdown: Breakdown
  productBreakdown: { product: string; count: number; outstanding: string; recoveryRate: number | null }[]
}

const TIER_COLORS: Record<string, string> = {
  Curable: '#16a34a',
  'At-risk': '#f59e0b',
  Doubtful: '#ea580c',
  Impaired: '#dc2626',
}

const ARREARS_ORDER = ['Current', '1-30', '31-90', '91-180', '181-360', '360+']

const PRODUCTS = [
  'Agribizz', 'Asset Finance', 'Vuka', 'Go Green', 'LPO/LSO', 'Migration', 'Talanta', 'VIBE', 'Group Loan',
]
const CLASSIFICATIONS = ['Normal', 'Watch', 'Substandard', 'Doubtful', 'Loss']
const TIERS = ['Curable', 'At-risk', 'Doubtful', 'Impaired']

interface OfficerRow {
  Officer: string
  PaymentsLogged: number
  TotalRecoveredKES: string
}

export default function PortfolioPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [officers, setOfficers] = useState<OfficerRow[]>([])
  const [product, setProduct] = useState('')
  const [classification, setClassification] = useState('')
  const [tier, setTier] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/export?type=officer-performance&format=json')
      .then((r) => r.json())
      .then((rows: OfficerRow[]) =>
        setOfficers(
          [...rows].sort((a, b) => Number(b.TotalRecoveredKES) - Number(a.TotalRecoveredKES))
        )
      )
      .catch(() => setOfficers([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (product) params.set('product', product)
    if (classification) params.set('classification', classification)
    if (tier) params.set('tier', tier)
    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [product, classification, tier])

  const tierData = data
    ? Object.entries(data.tierBreakdown).map(([name, v]) => ({
        name,
        value: Number(v.outstanding),
        count: v.count,
      }))
    : []

  const arrearsData = data
    ? ARREARS_ORDER.filter((b) => data.arrearsBreakdown[b]).map((b) => ({
        name: b,
        outstanding: Number(data.arrearsBreakdown[b].outstanding),
        count: data.arrearsBreakdown[b].count,
      }))
    : []

  const productData = data
    ? data.productBreakdown.map((p) => ({
        name: p.product,
        outstanding: Number(p.outstanding),
        recoveryRate: p.recoveryRate ?? 0,
      }))
    : []

  const countyData = data
    ? Object.entries(data.countyBreakdown)
        .map(([name, v]) => ({ name, outstanding: Number(v.outstanding) }))
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 10)
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Recovery analytics across the loan book</p>
        </div>
        <div className="flex gap-2">
          <select value={product} onChange={(e) => setProduct(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All products</option>
            {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={classification} onChange={(e) => setClassification(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All classifications</option>
            {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
            <option value="">All tiers</option>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {!loading && data && data.totalAccounts === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <p className="text-gray-500 text-sm">No loans match these filters. Import data or adjust filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Recovery Tier Breakdown (Barbell)">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}`}>
                  {tierData.map((entry) => (
                    <Cell key={entry.name} fill={TIER_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatKESCompact(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Arrears Aging">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={arrearsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis tickFormatter={(v) => formatKESCompact(v)} fontSize={11} width={70} />
                <Tooltip formatter={(v) => formatKESCompact(Number(v))} />
                <Bar dataKey="outstanding" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Outstanding by Product">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatKESCompact(v)} fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                <Tooltip formatter={(v) => formatKESCompact(Number(v))} />
                <Bar dataKey="outstanding" fill="#0f172a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Recovery Rate by Product">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={100} />
                <Tooltip formatter={(v) => formatPercent(Number(v))} />
                <Bar dataKey="recoveryRate" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 10 Counties by Outstanding" full>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={70} />
                <YAxis tickFormatter={(v) => formatKESCompact(v)} fontSize={11} width={70} />
                <Tooltip formatter={(v) => formatKESCompact(Number(v))} />
                <Bar dataKey="outstanding" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Collector Performance Ranking" full>
            {officers.length === 0 ? (
              <p className="text-sm text-gray-500">No recovery actions logged yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 font-medium">#</th>
                    <th className="py-2 font-medium">Officer</th>
                    <th className="py-2 font-medium text-right">Payments Logged</th>
                    <th className="py-2 font-medium text-right">Total Recovered</th>
                  </tr>
                </thead>
                <tbody>
                  {officers.map((o, i) => (
                    <tr key={o.Officer} className="border-b border-gray-50">
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 text-gray-900">{o.Officer}</td>
                      <td className="py-2 text-right">{o.PaymentsLogged}</td>
                      <td className="py-2 text-right font-medium">
                        {formatKESCompact(o.TotalRecoveredKES)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ChartCard>
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${full ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">{title}</h3>
      {children}
    </div>
  )
}
