import { describe, it, expect } from 'vitest'
import {
  computeArrearsBucket,
  computeRecoveryTier,
  computeDormancyDays,
  computeIsMatured,
  computeCreditBalance,
  isNPL,
  isValidLoanNo,
  trimName,
} from '@/lib/recovery-logic'

describe('computeArrearsBucket', () => {
  it('returns Current for 0 days', () => {
    expect(computeArrearsBucket(0)).toBe('Current')
  })
  it('returns Current for negative days', () => {
    expect(computeArrearsBucket(-5)).toBe('Current')
  })
  it('returns 1-30 for 1–30 days', () => {
    expect(computeArrearsBucket(1)).toBe('1-30')
    expect(computeArrearsBucket(30)).toBe('1-30')
  })
  it('returns 31-90 for 31–90 days', () => {
    expect(computeArrearsBucket(31)).toBe('31-90')
    expect(computeArrearsBucket(90)).toBe('31-90')
  })
  it('returns 91-180 for 91–180 days', () => {
    expect(computeArrearsBucket(91)).toBe('91-180')
    expect(computeArrearsBucket(180)).toBe('91-180')
  })
  it('returns 181-360 for 181–360 days', () => {
    expect(computeArrearsBucket(181)).toBe('181-360')
    expect(computeArrearsBucket(360)).toBe('181-360')
  })
  it('returns 360+ for over 360 days', () => {
    expect(computeArrearsBucket(361)).toBe('360+')
    expect(computeArrearsBucket(1000)).toBe('360+')
  })
})

describe('computeRecoveryTier', () => {
  it('Curable: arrears ≤30 and Normal or Watch', () => {
    expect(computeRecoveryTier(0, 'Normal')).toBe('Curable')
    expect(computeRecoveryTier(30, 'Watch')).toBe('Curable')
    expect(computeRecoveryTier(15, 'Normal')).toBe('Curable')
  })
  it('Impaired: classification is Loss', () => {
    expect(computeRecoveryTier(0, 'Loss')).toBe('Impaired')
    expect(computeRecoveryTier(500, 'Loss')).toBe('Impaired')
  })
  it('Impaired: arrears > 360', () => {
    expect(computeRecoveryTier(361, 'Normal')).toBe('Impaired')
    expect(computeRecoveryTier(365, 'Watch')).toBe('Impaired')
  })
  it('At-risk: arrears ≤180 and Watch/Substandard/Doubtful', () => {
    expect(computeRecoveryTier(50, 'Watch')).toBe('At-risk')
    expect(computeRecoveryTier(90, 'Substandard')).toBe('At-risk')
    expect(computeRecoveryTier(180, 'Doubtful')).toBe('At-risk')
  })
  it('Doubtful: everything else', () => {
    expect(computeRecoveryTier(200, 'Normal')).toBe('Doubtful')
    expect(computeRecoveryTier(200, 'Substandard')).toBe('Doubtful')
    expect(computeRecoveryTier(300, 'Watch')).toBe('Doubtful')
  })
})

describe('computeDormancyDays', () => {
  it('returns null when lastPayDate is null', () => {
    expect(computeDormancyDays(null)).toBeNull()
    expect(computeDormancyDays(undefined)).toBeNull()
  })
  it('computes correct days', () => {
    const asOf = new Date('2024-06-01')
    const lastPay = new Date('2024-01-01')
    const result = computeDormancyDays(lastPay, asOf)
    expect(result).toBe(152)
  })
  it('returns 0 if last pay is today', () => {
    const today = new Date()
    expect(computeDormancyDays(today, today)).toBe(0)
  })
})

describe('computeIsMatured', () => {
  it('returns false when no expectedCompletionDate', () => {
    expect(computeIsMatured(null, '10000')).toBe(false)
  })
  it('returns false when balance is zero or negative', () => {
    const past = new Date('2020-01-01')
    expect(computeIsMatured(past, '0')).toBe(false)
    expect(computeIsMatured(past, '-100')).toBe(false)
  })
  it('returns true when past completion date with positive balance', () => {
    const past = new Date('2020-01-01')
    expect(computeIsMatured(past, '50000')).toBe(true)
  })
  it('returns false when completion date is in the future', () => {
    const future = new Date('2099-01-01')
    expect(computeIsMatured(future, '50000')).toBe(false)
  })
})

describe('computeCreditBalance', () => {
  it('returns false for positive balance', () => {
    const result = computeCreditBalance('50000', '20000', '100000')
    expect(result.isCreditBalance).toBe(false)
    expect(result.creditBalanceType).toBeNull()
  })
  it('returns True overpayment when totalPaid > disbursedAmount', () => {
    const result = computeCreditBalance('-5000', '110000', '100000')
    expect(result.isCreditBalance).toBe(true)
    expect(result.creditBalanceType).toBe('True overpayment')
  })
  it('returns Likely misposting when totalPaid ≤ disbursedAmount', () => {
    const result = computeCreditBalance('-5000', '80000', '100000')
    expect(result.isCreditBalance).toBe(true)
    expect(result.creditBalanceType).toBe('Likely misposting')
  })
})

describe('isNPL', () => {
  it('Normal and Watch are not NPL', () => {
    expect(isNPL('Normal')).toBe(false)
    expect(isNPL('Watch')).toBe(false)
  })
  it('Substandard, Doubtful, Loss are NPL', () => {
    expect(isNPL('Substandard')).toBe(true)
    expect(isNPL('Doubtful')).toBe(true)
    expect(isNPL('Loss')).toBe(true)
  })
})

describe('isValidLoanNo', () => {
  it('rejects null/undefined/empty', () => {
    expect(isValidLoanNo(null)).toBe(false)
    expect(isValidLoanNo(undefined)).toBe(false)
    expect(isValidLoanNo('')).toBe(false)
    expect(isValidLoanNo('   ')).toBe(false)
  })
  it('rejects totals rows', () => {
    expect(isValidLoanNo('Total')).toBe(false)
    expect(isValidLoanNo('TOTAL')).toBe(false)
    expect(isValidLoanNo('Subtotal')).toBe(false)
    expect(isValidLoanNo('SUBTOTAL')).toBe(false)
  })
  it('accepts valid loan numbers', () => {
    expect(isValidLoanNo('LN-001234')).toBe(true)
    expect(isValidLoanNo('AG2024001')).toBe(true)
    expect(isValidLoanNo('12345')).toBe(true)
  })
})

describe('trimName', () => {
  it('trims leading/trailing whitespace', () => {
    expect(trimName('  John Doe  ')).toBe('John Doe')
  })
  it('collapses internal whitespace', () => {
    expect(trimName('John   Doe')).toBe('John Doe')
  })
  it('handles null/undefined', () => {
    expect(trimName(null)).toBe('')
    expect(trimName(undefined)).toBe('')
  })
})
