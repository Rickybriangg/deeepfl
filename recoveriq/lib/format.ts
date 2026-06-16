import Decimal from 'decimal.js'

Decimal.set({ toExpPos: 20, toExpNeg: -20 })

export function formatKES(
  amount: string | number | Decimal | null | undefined
): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  try {
    const d = new Decimal(amount.toString())
    const abs = d.abs()
    const formatted = abs
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return d.isNegative() ? `KES (${formatted})` : `KES ${formatted}`
  } catch {
    return '—'
  }
}

export function formatKESCompact(
  amount: string | number | Decimal | null | undefined
): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  try {
    const d = new Decimal(amount.toString())
    const abs = d.abs()
    let result: string
    if (abs.gte(1_000_000_000)) {
      result = abs.div(1_000_000_000).toFixed(2) + 'B'
    } else if (abs.gte(1_000_000)) {
      result = abs.div(1_000_000).toFixed(2) + 'M'
    } else if (abs.gte(1_000)) {
      result = abs.div(1_000).toFixed(1) + 'K'
    } else {
      result = abs.toFixed(2)
    }
    return d.isNegative() ? `KES (${result})` : `KES ${result}`
  } catch {
    return '—'
  }
}

export function parseDecimal(
  value: string | number | null | undefined
): Decimal | null {
  if (value === null || value === undefined || value === '') return null
  try {
    const cleaned = value.toString().replace(/,/g, '')
    return new Decimal(cleaned)
  } catch {
    return null
  }
}

export function formatPercent(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('en-KE')
}
