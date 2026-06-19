interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  accent?: 'blue' | 'green' | 'red' | 'amber' | 'purple'
}

const accentClasses = {
  blue: 'border-blue-500 bg-blue-50',
  green: 'border-green-500 bg-green-50',
  red: 'border-red-500 bg-red-50',
  amber: 'border-amber-500 bg-amber-50',
  purple: 'border-purple-500 bg-purple-50',
}

const trendColors = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-500 dark:text-gray-400',
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  accent = 'blue',
}: KpiCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 ${accentClasses[accent]} p-5 shadow-sm`}
    >
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
      {trend && trendLabel && (
        <p className={`text-xs font-medium mt-2 ${trendColors[trend]}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'} {trendLabel}
        </p>
      )}
    </div>
  )
}
