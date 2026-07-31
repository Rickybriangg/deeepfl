import Decimal from 'decimal.js'

// ---------------------------------------------------------------------------
// Loan insurance: reusable templates + per-loan policy maths.
//
// An InsuranceTemplate defines a cover (type, basis, coverage %, premium %).
// Insuring a loan snapshots those rates onto a LoanInsurance policy and derives
// two figures from the loan's own amounts:
//   insuredAmount = basisAmount × coveragePercent%
//   premiumAmount = insuredAmount × premiumRate%
// ---------------------------------------------------------------------------

export type CoverageType =
  | 'credit-life'
  | 'asset'
  | 'portfolio'
  | 'credit-guarantee'
  | 'other'

export type CoverageBasis = 'outstanding' | 'disbursed' | 'approved'

export const COVERAGE_TYPES: { value: CoverageType; label: string }[] = [
  { value: 'credit-life', label: 'Credit Life' },
  { value: 'asset', label: 'Asset / Collateral' },
  { value: 'portfolio', label: 'Portfolio Cover' },
  { value: 'credit-guarantee', label: 'Credit Guarantee' },
  { value: 'other', label: 'Other' },
]

export const COVERAGE_BASES: { value: CoverageBasis; label: string }[] = [
  { value: 'outstanding', label: 'Outstanding balance' },
  { value: 'disbursed', label: 'Disbursed amount' },
  { value: 'approved', label: 'Approved amount' },
]

// Out-of-the-box templates, seeded on first read so the feature is usable
// without any setup. Rates are indicative defaults, editable by managers.
export const DEFAULT_INSURANCE_TEMPLATES: Array<{
  name: string
  provider: string | null
  coverageType: CoverageType
  coverageBasis: CoverageBasis
  coveragePercent: string
  premiumRate: string
  termMonths: number | null
  description: string
}> = [
  {
    name: 'Credit Life Cover',
    provider: null,
    coverageType: 'credit-life',
    coverageBasis: 'outstanding',
    coveragePercent: '100',
    premiumRate: '1',
    termMonths: 12,
    description:
      'Settles the outstanding balance on death or permanent disability of the borrower.',
  },
  {
    name: 'Asset / Collateral Cover',
    provider: null,
    coverageType: 'asset',
    coverageBasis: 'disbursed',
    coveragePercent: '80',
    premiumRate: '2.5',
    termMonths: 12,
    description: 'Covers financed assets against loss, theft or damage.',
  },
  {
    name: 'Portfolio Credit Guarantee',
    provider: null,
    coverageType: 'credit-guarantee',
    coverageBasis: 'outstanding',
    coveragePercent: '50',
    premiumRate: '1.5',
    termMonths: null,
    description:
      'Partial guarantee against default losses across the covered book.',
  },
]

export interface PolicyBasisAmounts {
  outstandingBalance: string
  disbursedAmount: string
  approvedAmount: string
}

export interface PolicyAmounts {
  basisAmount: string
  insuredAmount: string
  premiumAmount: string
}

function d(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  try {
    return new Decimal(value.toString().replace(/,/g, ''))
  } catch {
    return new Decimal(0)
  }
}

export function basisAmountFor(
  basis: CoverageBasis,
  amounts: PolicyBasisAmounts
): Decimal {
  switch (basis) {
    case 'disbursed':
      return d(amounts.disbursedAmount)
    case 'approved':
      return d(amounts.approvedAmount)
    case 'outstanding':
    default:
      return Decimal.max(d(amounts.outstandingBalance), new Decimal(0))
  }
}

/**
 * Derives the insured and premium amounts for a policy from the loan's amounts
 * and the (snapshotted) coverage/premium percentages. Pure and deterministic.
 */
export function computePolicyAmounts(
  basis: CoverageBasis,
  coveragePercent: string | number,
  premiumRate: string | number,
  amounts: PolicyBasisAmounts
): PolicyAmounts {
  const basisAmount = basisAmountFor(basis, amounts)
  const coverage = d(coveragePercent).div(100)
  const premium = d(premiumRate).div(100)

  const insuredAmount = basisAmount.mul(coverage)
  const premiumAmount = insuredAmount.mul(premium)

  return {
    basisAmount: basisAmount.toFixed(2),
    insuredAmount: insuredAmount.toFixed(2),
    premiumAmount: premiumAmount.toFixed(2),
  }
}

/**
 * Builds a human-readable policy number, e.g. "POL-GRP12345-8F3A2".
 * `seed` should be a unique-ish value (e.g. a cuid or timestamp) supplied by the
 * caller so this stays deterministic/testable.
 */
export function makePolicyNo(loanNo: string, seed: string): string {
  const cleanLoan = loanNo.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'LOAN'
  const suffix = seed.replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase().padStart(5, '0')
  return `POL-${cleanLoan}-${suffix}`
}

export function isCoverageType(v: unknown): v is CoverageType {
  return COVERAGE_TYPES.some((t) => t.value === v)
}

export function isCoverageBasis(v: unknown): v is CoverageBasis {
  return COVERAGE_BASES.some((b) => b.value === v)
}
