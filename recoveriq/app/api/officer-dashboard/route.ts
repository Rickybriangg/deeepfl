import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Dedicated Recovery Officer Dashboard (roadmap 1.5): a single-officer
// rollup of their own queue, due-today/broken-promise counts, recent
// activity, and target progress — narrower than the shared Cases page.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const officerId = (session.user as { id: string }).id
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)

  const cases = await prisma.recoveryCase.findMany({
    where: { assignedOfficerId: officerId, status: { notIn: ['Recovered', 'Closed', 'Written-off'] } },
    include: { loan: true, actions: { orderBy: { timestamp: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  })

  let dueToday = 0
  let brokenPromises = 0
  for (const c of cases) {
    if (c.nextActionDate && c.nextActionDate >= startOfToday && c.nextActionDate < endOfToday) dueToday++
    if (
      c.status === 'Promised to pay' &&
      c.nextActionDate &&
      c.nextActionDate < now &&
      !c.actions.some((a) => a.type === 'Payment received')
    ) {
      brokenPromises++
    }
  }

  const recentActions = await prisma.recoveryAction.findMany({
    where: { officerId },
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: { case: { include: { loan: true } } },
  })

  const period = currentPeriod()
  const [year, month] = period.split('-').map(Number)
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 1)

  const target = await prisma.recoveryTarget.findUnique({
    where: { officerId_periodMonth: { officerId, periodMonth: period } },
  })
  const periodActions = await prisma.recoveryAction.findMany({
    where: { officerId, type: 'Payment received', timestamp: { gte: periodStart, lt: periodEnd } },
  })
  const actualAmount = periodActions.reduce((sum, a) => sum + Number(a.amountReceived ?? 0), 0)

  return NextResponse.json({
    queueSize: cases.length,
    dueToday,
    brokenPromises,
    cases: cases.slice(0, 50).map((c) => ({
      id: c.id,
      loanNo: c.loanNo,
      borrowerName: c.loan.borrowerName,
      outstandingBalance: c.loan.outstandingBalance,
      status: c.status,
      nextActionDate: c.nextActionDate,
    })),
    recentActions: recentActions.map((a) => ({
      id: a.id,
      type: a.type,
      outcome: a.outcome,
      timestamp: a.timestamp,
      loanNo: a.case.loanNo,
      borrowerName: a.case.loan.borrowerName,
    })),
    target: {
      period,
      targetAmount: target?.targetAmount ?? null,
      actualAmount,
    },
  })
}
