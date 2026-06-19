import { describe, it, expect } from 'vitest'
import {
  stageForDaysFromDue,
  renderTemplate,
  REMINDER_STAGES,
  CHANNEL_INTEGRATION,
} from '@/lib/reminder-engine'

describe('stageForDaysFromDue', () => {
  it('maps before-due offsets', () => {
    expect(stageForDaysFromDue(-14)).toBe('before-14')
    expect(stageForDaysFromDue(-7)).toBe('before-7')
    expect(stageForDaysFromDue(-1)).toBe('before-1')
  })
  it('maps due date', () => {
    expect(stageForDaysFromDue(0)).toBe('due-am')
  })
  it('maps overdue offsets', () => {
    expect(stageForDaysFromDue(1)).toBe('after-1')
    expect(stageForDaysFromDue(30)).toBe('after-30')
  })
  it('returns null for non-scheduled days', () => {
    expect(stageForDaysFromDue(-2)).toBeNull()
    expect(stageForDaysFromDue(5)).toBeNull()
    expect(stageForDaysFromDue(100)).toBeNull()
  })
})

describe('renderTemplate', () => {
  it('substitutes all placeholders', () => {
    const out = renderTemplate(
      'Hi {{name}}, loan {{loanNo}} owes {{amount}} ({{daysInArrears}}d)',
      { name: 'Jane', amount: 'KES 5,000', loanNo: 'LN-1', daysInArrears: 12 }
    )
    expect(out).toBe('Hi Jane, loan LN-1 owes KES 5,000 (12d)')
  })
  it('replaces repeated placeholders', () => {
    expect(renderTemplate('{{name}} {{name}}', { name: 'A', amount: '', loanNo: '', daysInArrears: 0 })).toBe('A A')
  })
})

describe('schedule + channel config', () => {
  it('has 10 schedule stages', () => {
    expect(REMINDER_STAGES).toHaveLength(10)
  })
  it('internal channel needs no integration; external ones do', () => {
    expect(CHANNEL_INTEGRATION.internal).toBeNull()
    expect(CHANNEL_INTEGRATION.sms).toBe('sms')
    expect(CHANNEL_INTEGRATION.email).toBe('smtp')
  })
})
