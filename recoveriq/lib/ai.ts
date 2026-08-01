import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { decryptSecret } from './crypto'
import { getCountyName } from './counties'
import { formatKES } from './format'
import {
  computeRiskScore,
  predictRecovery,
  type RiskScoreInput,
} from './recovery-logic'

// Default to the current flagship model; overridable per-deployment.
export const DEFAULT_AI_MODEL = 'claude-opus-5'

export interface AiCredentials {
  apiKey: string
  model: string
}

/**
 * Resolves the Anthropic API key. Prefers the encrypted IntegrationSetting
 * (configured under Settings → Integrations), falling back to the
 * ANTHROPIC_API_KEY environment variable. Returns null when nothing is set.
 */
export async function getAiCredentials(): Promise<AiCredentials | null> {
  try {
    const row = await prisma.integrationSetting.findUnique({ where: { key: 'anthropic' } })
    if (row?.config) {
      const values = JSON.parse(decryptSecret(row.config)) as {
        apiKey?: string
        model?: string
      }
      if (values.apiKey) {
        return { apiKey: values.apiKey, model: values.model?.trim() || DEFAULT_AI_MODEL }
      }
    }
  } catch {
    // fall through to env
  }
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) {
    return { apiKey: envKey, model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_AI_MODEL }
  }
  return null
}

export type MessageChannel = 'sms' | 'whatsapp' | 'email' | 'letter'
export type MessageTone = 'friendly' | 'firm' | 'final'

const CHANNEL_GUIDANCE: Record<MessageChannel, string> = {
  sms: 'A single SMS, under 320 characters, plain text, no markdown or emoji. No greeting line — get to the point.',
  whatsapp: 'A short WhatsApp message, warm but professional, 2–4 short lines. A single relevant emoji is acceptable.',
  email: 'A short email with a subject line (prefix it "Subject: ") then the body. Professional register.',
  letter: 'A formal demand letter: dated salutation, body paragraphs, and a formal sign-off from "YEDF Credit Recovery Unit".',
}

const TONE_GUIDANCE: Record<MessageTone, string> = {
  friendly: 'Courteous and encouraging — assume good faith and a temporary slip. Offer to discuss a plan.',
  firm: 'Firm and direct — the account is materially overdue. State the obligation clearly and request immediate action, while remaining respectful.',
  final: 'A final notice before escalation — make the consequences (CRB listing / legal action) explicit and unambiguous, but factual and non-threatening.',
}

export interface CollectionLoanContext {
  loanNo: string
  borrowerName: string
  product: string
  countyCode: number | null
  disbursedAmount: string
  totalPaid: string
  outstandingBalance: string
  daysInArrears: number
  classification: string
  arrearsBucket: string | null
  recoveryTier: string | null
  dormancyDays: number | null
  lastPayDate: Date | null
}

/**
 * Builds the grounded facts block the model must not contradict. Keeping the
 * numbers here (rather than trusting the model to recall them) is what keeps
 * generated messages accurate.
 */
function factsBlock(loan: CollectionLoanContext) {
  const riskInput: RiskScoreInput = {
    daysInArrears: loan.daysInArrears,
    classification: loan.classification,
    dormancyDays: loan.dormancyDays,
    outstandingBalance: loan.outstandingBalance,
    disbursedAmount: loan.disbursedAmount,
  }
  const risk = computeRiskScore(riskInput)
  const prediction = predictRecovery(risk, loan.outstandingBalance)

  const lines = [
    `Borrower: ${loan.borrowerName}`,
    `Loan number: ${loan.loanNo}`,
    `Product: ${loan.product}`,
    loan.countyCode ? `County: ${getCountyName(loan.countyCode)}` : null,
    `Amount disbursed: ${formatKES(loan.disbursedAmount)}`,
    `Total repaid to date: ${formatKES(loan.totalPaid)}`,
    `Outstanding balance: ${formatKES(loan.outstandingBalance)}`,
    `Days in arrears: ${loan.daysInArrears}`,
    `Classification: ${loan.classification}`,
    loan.lastPayDate ? `Last payment: ${loan.lastPayDate.toISOString().slice(0, 10)}` : 'Last payment: none on record',
    `Internal risk band: ${risk.band} (${risk.score}/100)`,
    `Recommended internal strategy: ${prediction.recommendedStrategy}`,
  ].filter(Boolean)

  return { text: lines.join('\n'), risk, prediction }
}

const SYSTEM_PROMPT = `You are a loan-recovery officer at the Youth Enterprise Development Fund (YEDF), a Kenyan government fund, drafting outreach to a borrower whose loan is overdue.

Rules you must follow:
- Use ONLY the facts provided. Never invent amounts, dates, phone numbers, account numbers, or payment channels.
- All money is Kenyan Shillings (KES). Quote figures exactly as given.
- Be respectful and compliant — no threats, harassment, or abusive language. Legal or CRB (Credit Reference Bureau) escalation may be stated factually only when the requested tone calls for it.
- Do not promise waivers, discounts, or terms that were not provided.
- Write in clear English. Keep it concise for the channel.
- Output ONLY the message itself — no preamble, no explanation, no notes about what you did.`

export interface DraftResult {
  message: string
  model: string
  riskBand: string
  riskScore: number
  recommendedStrategy: string
}

/**
 * Generates a collection message draft for a loan via Claude.
 * Throws if credentials are missing or the API call fails.
 */
export async function draftCollectionMessage(
  loan: CollectionLoanContext,
  channel: MessageChannel,
  tone: MessageTone,
  creds: AiCredentials
): Promise<DraftResult> {
  const { text: facts, risk, prediction } = factsBlock(loan)
  const client = new Anthropic({ apiKey: creds.apiKey })

  const userPrompt = `Draft a collection message for this borrower.

Channel: ${channel}
${CHANNEL_GUIDANCE[channel]}

Tone: ${tone}
${TONE_GUIDANCE[tone]}

Facts (do not contradict any of these):
${facts}`

  const response = await client.messages.create({
    model: creds.model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The AI declined to draft this message.')
  }

  const message = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

  return {
    message,
    model: response.model,
    riskBand: risk.band,
    riskScore: risk.score,
    recommendedStrategy: prediction.recommendedStrategy,
  }
}
