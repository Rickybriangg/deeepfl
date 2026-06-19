import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { isNPL } from '@/lib/recovery-logic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const snapshots = await prisma.portfolioSnapshot.findMany({
    orderBy: { capturedAt: 'asc' },
    take: 90,
  })
  return NextResponse.json(snapshots)
}

// Lets an Admin/Manager capture a snapshot on demand (e.g. right after an
// import), in addition to the daily cron job.
export async function POST() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Manager' && role !== 'Superadmin')) {
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
