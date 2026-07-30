'use client'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts'
import { formatKESCompact, formatPercent, formatNumber } from '@/lib/format'

interface Breakdown {
  [key: string]: { count: number; outstanding: string }
}
interface Product {
  product: string
  count: number
  outstanding: string
  recoveryRate: number | null
}

interface Props {
  delinquencyBreakdown?: Breakdown
  productBreakdown?: Product[]
  recoveryRate: number | null
  dueToday?: number
  dueThisWeek?: number
  dueThisMonth?: number
  totalOverdue?: string
  totalOutstanding: string
}

// Ordered least → most severe, with an intuitive green→red ramp so risk
// concentration is legible at a glance.
const STAGE_ORDER = [
  'Current', 'Due Today', '1-7 Days Overdue', '8-30 Days Overdue',
  '31-60 Days Overdue', '61-90 Days Overdue', '91-180 Days Overdue', 'Defaulted',
]
const STAGE_HEX: Record<string, string> = {
  Current: '#16a34a',
  'Due Today': '#0ea5e9',
  '1-7 Days Overdue': '#eab308',
  '8-30 Days Overdue': '#f59e0b',
  '31-60 Days Overdue': '#f97316',
  '61-90 Days Overdue': '#ea580c',
  '91-180 Days Overdue': '#ef4444',
  Defaulted: '#b91c1c',
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}

export function RecoveryVisuals({
  delinquencyBreakdown,
  productBreakdown,
  recoveryRate,
  dueToday = 0,
  dueThisWeek = 0,
  dueThisMonth = 0,
  totalOverdue,
  totalOutstanding,
}: Props) {
  const stageData = STAGE_ORDER.map((stage) => ({
    name: stage,
    value: Number(delinquencyBreakdown?.[stage]?.outstanding ?? 0),
    count: delinquencyBreakdown?.[stage]?.count ?? 0,
  })).filter((d) => d.value > 0)

  // Recovery vs outstanding — the headline "how much are we clawing back" gauge.
  const rate = recoveryRate ?? 0
  const gaugeData = [{ name: 'Recovery', value: Math.min(100, Math.max(0, rate)) }]
  const gaugeColor = rate >= 60 ? '#16a34a' : rate >= 30 ? '#f59e0b' : '#dc2626'

  const productData = (productBreakdown ?? [])
    .filter((p) => p.recoveryRate != null)
    .sort((a, b) => (b.recoveryRate ?? 0) - (a.recoveryRate ?? 0))
    .slice(0, 8)
    .map((p) => ({ product: p.product, rate: p.recoveryRate ?? 0 }))

  const dueData = [
    { name: 'Today', value: dueToday, fill: '#0ea5e9' },
    { name: 'This Week', value: dueThisWeek, fill: '#6366f1' },
    { name: 'This Month', value: dueThisMonth, fill: '#8b5cf6' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Delinquency distribution donut */}
      <Card title="Where the risk sits" subtitle="Outstanding balance by delinquency stage">
        {stageData.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {stageData.map((d) => (
                    <Cell key={d.name} fill={STAGE_HEX[d.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, _n, p) => [
                    `${formatKESCompact(Number(v))} · ${formatNumber((p?.payload as { count: number })?.count)} loans`,
                    (p?.payload as { name: string })?.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="text-xs space-y-1.5 w-full sm:w-44 shrink-0">
              {stageData.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STAGE_HEX[d.name] ?? '#94a3b8' }} />
                  <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{d.name}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatKESCompact(d.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Recovery-rate gauge */}
      <Card title="Recovery performance" subtitle="Lifetime paid vs disbursed">
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="55%" height={220}>
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={gaugeData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={12} fill={gaugeColor} background />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="flex-1">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 leading-none">
              {formatPercent(recoveryRate)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">of disbursed value recovered</p>
            <div className="mt-4 space-y-1.5 text-sm">
              <Row label="Total outstanding" value={formatKESCompact(totalOutstanding)} />
              <Row label="Total overdue" value={formatKESCompact(totalOverdue ?? '0')} danger />
            </div>
          </div>
        </div>
      </Card>

      {/* Recovery by product */}
      <Card title="Best & worst recovering products" subtitle="Recovery rate by loan product">
        {productData.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, productData.length * 34)}>
            <BarChart data={productData} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
              <YAxis type="category" dataKey="product" width={90} fontSize={11} />
              <Tooltip formatter={(v) => formatPercent(Number(v))} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {productData.map((d) => (
                  <Cell key={d.product} fill={d.rate >= 60 ? '#16a34a' : d.rate >= 30 ? '#f59e0b' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Collection pipeline */}
      <Card title="Collection pipeline" subtitle="Loans coming due — act before they slip">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dueData} margin={{ top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip formatter={(v) => `${formatNumber(Number(v))} loans`} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {dueData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </span>
    </div>
  )
}

function Empty() {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <p className="text-sm text-gray-400">No data yet</p>
    </div>
  )
}
