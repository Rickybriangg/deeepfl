import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { isNPL } from '@/lib/recovery-logic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Invoked daily by the Vercel cron defined in vercel.json. Vercel signs cron
// requests with this bearer token automatically; reject anything else.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loans = await prisma.loan.findMany()

  let totalOutstanding = new Decimal(0)
  let totalDisbursed = new Decimal(0)
  let totalPaid = new Decimal(0)
  let totalOverdue = new Decimal(0)
  let nplOutstanding = new Decimal(0)
  let par30Outstanding = new Decimal(0)
  let defaultedOutstanding = new Decimal(0)
  let positiveOutstanding = new Decimal(0)

  for (const loan of loans) {
    const outstanding = new Decimal(loan.outstandingBalance)
    totalOutstanding = totalOutstanding.plus(outstanding)
    totalDisbursed = totalDisbursed.plus(new Decimal(loan.disbursedAmount))
    totalPaid = totalPaid.plus(new Decimal(loan.totalPaid))

    if (outstanding.gt(0)) {
      positiveOutstanding = positiveOutstanding.plus(outstanding)
      if (isNPL(loan.classification as never)) nplOutstanding = nplOutstanding.plus(outstanding)
      if (loan.daysInArrears > 30) par30Outstanding = par30Outstanding.plus(outstanding)
      if (loan.daysInArrears > 0) totalOverdue = totalOverdue.plus(outstanding)
      if (loan.daysInArrears > 180) defaultedOutstanding = defaultedOutstanding.plus(outstanding)
    }
  }

  const snapshot = await prisma.portfolioSnapshot.create({
    data: {
      totalOutstanding: totalOutstanding.toFixed(2),
      totalOverdue: totalOverdue.toFixed(2),
      totalAccounts: loans.length,
      recoveryRate: totalDisbursed.gt(0)
        ? totalPaid.div(totalDisbursed).mul(100).toNumber()
        : null,
      nplRatio: positiveOutstanding.gt(0)
        ? nplOutstanding.div(positiveOutstanding).mul(100).toNumber()
        : null,
      par30: positiveOutstanding.gt(0)
        ? par30Outstanding.div(positiveOutstanding).mul(100).toNumber()
        : null,
      defaultRate: positiveOutstanding.gt(0)
        ? defaultedOutstanding.div(positiveOutstanding).mul(100).toNumber()
        : null,
    },
  })

  return NextResponse.json(snapshot)
}
