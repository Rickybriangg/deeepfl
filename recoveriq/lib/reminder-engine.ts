// Reminder schedule + template logic for the Automated Reminder Engine
// (roadmap 1.3). Pure functions so they can be unit-tested without a DB.

export type ReminderChannel = 'internal' | 'sms' | 'whatsapp' | 'email' | 'push' | 'voice'

export const REMINDER_CHANNELS: ReminderChannel[] = ['internal', 'sms', 'whatsapp', 'email', 'push', 'voice']

// Each channel maps to the IntegrationSetting key that must be configured for
// real delivery; `internal` is always available (CRM notification).
export const CHANNEL_INTEGRATION: Record<ReminderChannel, string | null> = {
  internal: null,
  sms: 'sms',
  whatsapp: 'whatsapp',
  email: 'smtp',
  push: 'push',
  voice: 'voice',
}

export interface ReminderStage {
  key: string
  label: string
  // Days relative to due date: negative = before, 0 = on due date, positive = after.
  offset: number
}

// The configurable schedule from roadmap 1.3.
export const REMINDER_STAGES: ReminderStage[] = [
  { key: 'before-14', label: '14 days before due', offset: -14 },
  { key: 'before-7', label: '7 days before due', offset: -7 },
  { key: 'before-3', label: '3 days before due', offset: -3 },
  { key: 'before-1', label: '1 day before due', offset: -1 },
  { key: 'due-am', label: 'Due date (morning)', offset: 0 },
  { key: 'after-1', label: '1 day overdue', offset: 1 },
  { key: 'after-3', label: '3 days overdue', offset: 3 },
  { key: 'after-7', label: '7 days overdue', offset: 7 },
  { key: 'after-14', label: '14 days overdue', offset: 14 },
  { key: 'after-30', label: '30 days overdue', offset: 30 },
]

export const DEFAULT_TEMPLATE_BODY: Record<string, string> = {
  'before-14': 'Dear {{name}}, your loan {{loanNo}} payment of {{amount}} is due in 14 days. Kindly prepare to pay on time.',
  'before-7': 'Dear {{name}}, a friendly reminder that loan {{loanNo}} ({{amount}}) is due in 7 days.',
  'before-3': 'Dear {{name}}, loan {{loanNo}} ({{amount}}) falls due in 3 days. Please arrange payment.',
  'before-1': 'Dear {{name}}, loan {{loanNo}} ({{amount}}) is due tomorrow.',
  'due-am': 'Dear {{name}}, loan {{loanNo}} ({{amount}}) is due today. Kindly pay to avoid penalties.',
  'after-1': 'Dear {{name}}, loan {{loanNo}} is 1 day overdue ({{amount}} outstanding). Please pay immediately.',
  'after-3': 'Dear {{name}}, loan {{loanNo}} is 3 days overdue. Outstanding {{amount}}. Contact us to arrange payment.',
  'after-7': 'Dear {{name}}, loan {{loanNo}} is 7 days overdue ({{amount}}). Urgent payment required.',
  'after-14': 'Dear {{name}}, loan {{loanNo}} is 14 days overdue ({{amount}}). Your account may be escalated.',
  'after-30': 'Dear {{name}}, loan {{loanNo}} is 30 days overdue ({{amount}}). Escalation to recovery is imminent.',
}

// Determines which schedule stage (if any) applies to a loan today, based on
// the days between today and the due date. Returns the matching stage key or
// null. `daysFromDue` > 0 means overdue.
export function stageForDaysFromDue(daysFromDue: number): string | null {
  const match = REMINDER_STAGES.find((s) => s.offset === daysFromDue)
  return match?.key ?? null
}

export function renderTemplate(
  body: string,
  vars: { name: string; amount: string; loanNo: string; daysInArrears: number }
): string {
  return body
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{amount\}\}/g, vars.amount)
    .replace(/\{\{loanNo\}\}/g, vars.loanNo)
    .replace(/\{\{daysInArrears\}\}/g, String(vars.daysInArrears))
}
