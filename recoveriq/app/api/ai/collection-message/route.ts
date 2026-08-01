import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getAiCredentials,
  draftCollectionMessage,
  type MessageChannel,
  type MessageTone,
} from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const schema = z.object({
  loanNo: z.string().min(1),
  channel: z.enum(['sms', 'whatsapp', 'email', 'letter']),
  tone: z.enum(['friendly', 'firm', 'final']),
})

// POST /api/ai/collection-message
// Drafts a channel- and tone-appropriate collection message for a loan,
// grounded in that loan's real figures and internal risk score.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { loanNo, channel, tone } = parsed.data

  const creds = await getAiCredentials()
  if (!creds) {
    return NextResponse.json(
      { error: 'AI is not configured. Add an Anthropic API key under Settings → Integrations.' },
      { status: 503 }
    )
  }

  const loan = await prisma.loan.findUnique({ where: { loanNo } })
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  try {
    const result = await draftCollectionMessage(
      {
        loanNo: loan.loanNo,
        borrowerName: loan.borrowerName,
        product: loan.product,
        countyCode: loan.countyCode,
        disbursedAmount: loan.disbursedAmount,
        totalPaid: loan.totalPaid,
        outstandingBalance: loan.outstandingBalance,
        daysInArrears: loan.daysInArrears,
        classification: loan.classification,
        arrearsBucket: loan.arrearsBucket,
        recoveryTier: loan.recoveryTier,
        dormancyDays: loan.dormancyDays,
        lastPayDate: loan.lastPayDate,
      },
      channel as MessageChannel,
      tone as MessageTone,
      creds
    )
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate a draft'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
