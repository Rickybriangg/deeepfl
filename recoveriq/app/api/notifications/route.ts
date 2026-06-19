import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Always read live data — this powers an in-app alerts feed.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    loansDueToday,
    overdueAccounts,
    missedPromises,
    highRiskCustomers,
    recentEscalations,
    officersWithCases,
  ] = await Promise.all([
    prisma.loan.count({
      where: {
        daysInArrears: { lte: 0 },
        expectedCompletionDate: { gte: startOfToday, lt: endOfToday },
      },
    }),
    prisma.loan.count({ where: { daysInArrears: { gt: 0 } } }),
    prisma.recoveryCase.count({
      where: { status: 'Promised to pay', nextActionDate: { lt: now } },
    }),
    prisma.loan.count({
      where: { recoveryTier: { in: ['Doubtful', 'Impaired'] } },
    }),
    prisma.auditLog.findMany({
      where: { action: 'PTP_AUTO_ESCALATED', timestamp: { gte: sevenDaysAgo } },
      include: { actor: true },
      orderBy: { timestamp: 'desc' },
      take: 20,
    }),
    prisma.user.findMany({
      where: { role: 'Officer' },
      include: {
        cases: { where: { status: { notIn: ['Recovered', 'Closed', 'Written-off'] } } },
        actions: { where: { timestamp: { gte: sevenDaysAgo } }, take: 1 },
      },
    }),
  ])

  const inactiveCollectors = officersWithCases
    .filter((o) => o.cases.length > 0 && o.actions.length === 0)
    .map((o) => ({ id: o.id, name: o.name, assignedCases: o.cases.length }))

  return NextResponse.json({
    loansDueToday,
    overdueAccounts,
    missedPromises,
    highRiskCustomers,
    inactiveCollectors,
    escalationEvents: recentEscalations.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      entityId: e.entityId,
      actor: e.actor.name,
    })),
  })
}
