import { describe, it, expect } from 'vitest'
import { suggestEscalation, generateDemandLetter, generateSmsText } from '@/lib/escalation'

describe('suggestEscalation', () => {
  it('suggests Reminder for ≤30 days', () => {
    expect(suggestEscalation(0)).toBe('Reminder')
    expect(suggestEscalation(30)).toBe('Reminder')
  })
  it('suggests Demand letter for 31-90 days', () => {
    expect(suggestEscalation(60)).toBe('Demand letter')
  })
  it('suggests Guarantor contact for 91-180 days', () => {
    expect(suggestEscalation(150)).toBe('Guarantor contact')
  })
  it('suggests CRB listing for 181-360 days', () => {
    expect(suggestEscalation(300)).toBe('CRB listing')
  })
  it('suggests Legal for 361-720 days', () => {
    expect(suggestEscalation(500)).toBe('Legal')
  })
  it('suggests Write-off review beyond 720 days', () => {
    expect(suggestEscalation(800)).toBe('Write-off review')
  })
})

describe('generateDemandLetter', () => {
  it('merges borrower fields into the letter', () => {
    const letter = generateDemandLetter({
      borrowerName: 'Jane Doe',
      loanNo: 'LN-001',
      outstandingBalance: '50000.00',
      daysInArrears: 45,
    })
    expect(letter).toContain('Jane Doe')
    expect(letter).toContain('LN-001')
    expect(letter).toContain('50000.00')
    expect(letter).toContain('45')
  })
})

describe('generateSmsText', () => {
  it('merges borrower fields into the SMS', () => {
    const sms = generateSmsText({
      borrowerName: 'John Smith',
      loanNo: 'LN-002',
      outstandingBalance: '20000.00',
    })
    expect(sms).toContain('John Smith')
    expect(sms).toContain('LN-002')
    expect(sms).toContain('20000.00')
  })
})
