import Decimal from 'decimal.js'

export type ArrearsBucket =
  | 'Current'
  | '1-30'
  | '31-90'
  | '91-180'
  | '181-360'
  | '360+'

export type RecoveryTier = 'Curable' | 'At-risk' | 'Doubtful' | 'Impaired'

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
