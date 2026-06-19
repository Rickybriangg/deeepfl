import Decimal from 'decimal.js'

export type ArrearsBucket =
  | 'Current'
  | '1-30'
  | '31-90'
  | '91-180'
  | '181-360'
  | '360+'

export type RecoveryTier = 'Curable' | 'At-risk' | 'Doubtful' | 'Impaired'

export type DelinquencyStage =
  | 'Current'
  | 'Due Today'
  | '1-7 Days Overdue'
  | '8-30 Days Overdue'
  | '31-60 Days Overdue'
  | '61-90 Days Overdue'
  | '91-180 Days Overdue'
  | 'Defaulted'

// Ordered for display (least to most severe).
export const DELINQUENCY_STAGES: DelinquencyStage[] = [
  'Current',
  'Due Today',
  '1-7 Days Overdue',
  '8-30 Days Overdue',
  '31-60 Days Overdue',
  '61-90 Days Overdue',
  '91-180 Days Overdue',
  'Defaulted',
]

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Classifies a loan's delinquency stage from its days in arrears.
 * "Due Today" is only assigned when a non-overdue loan has a due date that
 * falls on `asOf` (best-effort, since the source data has no per-installment
 * schedule yet); otherwise a non-overdue loan is "Current".
 */
export function computeDelinquencyStage(
  daysInArrears: number,
  opts?: { dueDate?: Date | null; asOf?: Date }
): DelinquencyStage {
  const days = daysInArrears ?? 0
  if (days <= 0) {
    const dueDate = opts?.dueDate
    if (dueDate && isSameDay(dueDate, opts?.asOf ?? new Date())) {
      return 'Due Today'
    }
    return 'Current'
  }
  if (days <= 7) return '1-7 Days Overdue'
  if (days <= 30) return '8-30 Days Overdue'
  if (days <= 60) return '31-60 Days Overdue'
  if (days <= 90) return '61-90 Days Overdue'
  if (days <= 180) return '91-180 Days Overdue'
  return 'Defaulted'
}

export type LoanClassification =
  | 'Normal'
  | 'Watch'
  | 'Substandard'
  | 'Doubtful'
  | 'Loss'

export function computeArrearsBucket(daysInArrears: number): ArrearsBucket {
  if (daysInArrears <= 0) return 'Current'
  if (daysInArrears <= 30) return '1-30'
  if (daysInArrears <= 90) return '31-90'
  if (daysInArrears <= 180) return '91-180'
  if (daysInArrears <= 360) return '181-360'
  return '360+'
}

export function computeRecoveryTier(
  daysInArrears: number,
  classification: LoanClassification
): RecoveryTier {
  // Precedence order as specified
  if (
    daysInArrears <= 30 &&
    (classification === 'Normal' || classification === 'Watch')
  ) {
    return 'Curable'
  }
  if (classification === 'Loss' || daysInArrears > 360) {
    return 'Impaired'
  }
  if (
    daysInArrears <= 180 &&
    (classification === 'Watch' ||
      classification === 'Substandard' ||
      classification === 'Doubtful')
  ) {
    return 'At-risk'
  }
  return 'Doubtful'
}

export function computeDormancyDays(
  lastPayDate: Date | null | undefined,
  asOf: Date = new Date()
): number | null {
  if (!lastPayDate) return null
  const diffMs = asOf.getTime() - lastPayDate.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function computeIsMatured(
  expectedCompletionDate: Date | null | undefined,
  outstandingBalance: string,
  asOf: Date = new Date()
): boolean {
  if (!expectedCompletionDate) return false
  try {
    const balance = new Decimal(outstandingBalance)
    return expectedCompletionDate < asOf && balance.gt(0)
  } catch {
    return false
  }
}

export function computeCreditBalance(
  outstandingBalance: string,
  totalPaid: string,
  disbursedAmount: string
): { isCreditBalance: boolean; creditBalanceType: string | null } {
  try {
    const outstanding = new Decimal(outstandingBalance)
    if (!outstanding.isNegative()) {
      return { isCreditBalance: false, creditBalanceType: null }
    }
    const paid = new Decimal(totalPaid)
    const disbursed = new Decimal(disbursedAmount)
    const isOverpayment = paid.gt(disbursed)
    return {
      isCreditBalance: true,
      creditBalanceType: isOverpayment
        ? 'True overpayment'
        : 'Likely misposting',
    }
  } catch {
    return { isCreditBalance: false, creditBalanceType: null }
  }
}

export function isNPL(classification: LoanClassification): boolean {
  return (
    classification === 'Substandard' ||
    classification === 'Doubtful' ||
    classification === 'Loss'
  )
}

export function computeNPLRatio(
  loans: Array<{ classification: string; outstandingBalance: string }>
): Decimal {
  let nplOutstanding = new Decimal(0)
  let totalPositiveOutstanding = new Decimal(0)

  for (const loan of loans) {
    try {
      const balance = new Decimal(loan.outstandingBalance)
      if (balance.gt(0)) {
        totalPositiveOutstanding = totalPositiveOutstanding.plus(balance)
        if (isNPL(loan.classification as LoanClassification)) {
          nplOutstanding = nplOutstanding.plus(balance)
        }
      }
    } catch {
      // skip malformed rows
    }
  }

  if (totalPositiveOutstanding.isZero()) return new Decimal(0)
  return nplOutstanding.div(totalPositiveOutstanding).mul(100)
}

export function isValidLoanNo(loanNo: unknown): boolean {
  if (loanNo === null || loanNo === undefined) return false
  const s = String(loanNo).trim()
  if (s === '' || s.toLowerCase() === 'total' || s.toLowerCase() === 'subtotal')
    return false
  // Must have at least some alphanumeric content
  return /\w/.test(s)
}

export function trimName(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
}
