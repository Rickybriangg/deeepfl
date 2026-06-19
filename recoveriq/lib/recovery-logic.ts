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

// ---------------------------------------------------------------------------
// Customer Risk Scoring (roadmap 1.7) — in-house, rules-based.
// Produces a 0–100 risk score and a band from data already on the loan,
// without any external credit-bureau call. Higher score = higher risk.
// ---------------------------------------------------------------------------

export type RiskBand = 'Low' | 'Medium' | 'High' | 'Critical'

export interface RiskScoreInput {
  daysInArrears: number
  classification: string
  dormancyDays?: number | null
  // repayment progress: totalPaid / disbursedAmount, derived by the caller
  outstandingBalance: string
  disbursedAmount: string
  brokenPromises?: number
}

export interface RiskScore {
  score: number
  band: RiskBand
  factors: string[]
}

export interface RiskBandThresholds {
  mediumMin: number
  highMin: number
  criticalMin: number
}

const DEFAULT_RISK_THRESHOLDS: RiskBandThresholds = { mediumMin: 25, highMin: 50, criticalMin: 75 }

export function bandForScore(score: number, thresholds: RiskBandThresholds = DEFAULT_RISK_THRESHOLDS): RiskBand {
  if (score >= thresholds.criticalMin) return 'Critical'
  if (score >= thresholds.highMin) return 'High'
  if (score >= thresholds.mediumMin) return 'Medium'
  return 'Low'
}

export function computeRiskScore(input: RiskScoreInput, thresholds?: RiskBandThresholds): RiskScore {
  const factors: string[] = []
  let score = 0

  // Days in arrears — the single strongest signal (up to 45 pts).
  const dia = input.daysInArrears ?? 0
  if (dia > 360) {
    score += 45
    factors.push('Over 360 days in arrears')
  } else if (dia > 180) {
    score += 38
    factors.push('181–360 days in arrears')
  } else if (dia > 90) {
    score += 30
    factors.push('91–180 days in arrears')
  } else if (dia > 30) {
    score += 18
    factors.push('31–90 days in arrears')
  } else if (dia > 0) {
    score += 8
    factors.push('1–30 days in arrears')
  }

  // Classification (up to 25 pts).
  switch (input.classification) {
    case 'Loss':
      score += 25
      factors.push('Classified Loss')
      break
    case 'Doubtful':
      score += 18
      factors.push('Classified Doubtful')
      break
    case 'Substandard':
      score += 12
      factors.push('Classified Substandard')
      break
    case 'Watch':
      score += 6
      factors.push('Classified Watch')
      break
  }

  // Repayment progress (up to 15 pts): how much principal is still unpaid.
  try {
    const outstanding = new Decimal(input.outstandingBalance)
    const disbursed = new Decimal(input.disbursedAmount)
    if (disbursed.gt(0) && outstanding.gt(0)) {
      const ratio = outstanding.div(disbursed).toNumber()
      if (ratio >= 0.9) {
        score += 15
        factors.push('Little to no principal repaid')
      } else if (ratio >= 0.6) {
        score += 9
        factors.push('Under 40% of principal repaid')
      } else if (ratio >= 0.3) {
        score += 4
      }
    }
  } catch {
    // ignore malformed amounts
  }

  // Dormancy (up to 10 pts): time since last payment.
  const dormancy = input.dormancyDays ?? null
  if (dormancy !== null) {
    if (dormancy > 180) {
      score += 10
      factors.push('No payment in over 180 days')
    } else if (dormancy > 90) {
      score += 6
      factors.push('No payment in over 90 days')
    }
  }

  // Broken promises (up to 5 pts): behavioural signal.
  const broken = input.brokenPromises ?? 0
  if (broken > 0) {
    score += Math.min(5, broken * 5)
    factors.push(`${broken} broken promise${broken > 1 ? 's' : ''} to pay`)
  }

  score = Math.min(100, Math.round(score))
  return { score, band: bandForScore(score, thresholds), factors }
}

// ---------------------------------------------------------------------------
// AI Predictive Recovery Engine (roadmap 1.8) — in-house heuristic.
// Derives a payment-probability proxy from the risk score and recommends
// the next collection strategy. Not a trained model; clearly a heuristic
// stand-in until an external model API is supplied.
// ---------------------------------------------------------------------------

export interface RecoveryPrediction {
  paymentProbability: number // 0–100
  recommendedStrategy: string
  priority: number // 0–100, higher = action sooner
}

export interface RiskBandStrategies {
  Low: string
  Medium: string
  High: string
  Critical: string
}

const DEFAULT_RISK_STRATEGIES: RiskBandStrategies = {
  Low: 'Automated friendly reminder (SMS/WhatsApp)',
  Medium: 'Officer call + payment plan offer',
  High: 'Field visit and restructure negotiation',
  Critical: 'Demand letter / legal escalation',
}

export function predictRecovery(
  risk: RiskScore,
  outstandingBalance: string,
  strategies: RiskBandStrategies = DEFAULT_RISK_STRATEGIES
): RecoveryPrediction {
  // Payment probability is the inverse of risk, lightly floored/capped.
  const paymentProbability = Math.max(5, Math.min(95, 100 - risk.score))

  const recommendedStrategy = strategies[risk.band]

  // Prioritise by recovery potential: high risk AND high balance first.
  let balanceWeight = 0
  try {
    const bal = new Decimal(outstandingBalance)
    if (bal.gte(1_000_000)) balanceWeight = 30
    else if (bal.gte(250_000)) balanceWeight = 20
    else if (bal.gte(50_000)) balanceWeight = 10
  } catch {
    // ignore
  }
  const priority = Math.min(100, Math.round(risk.score * 0.7 + balanceWeight))

  return { paymentProbability, recommendedStrategy, priority }
}
