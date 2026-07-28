import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Always read live data; never serve a cached (e.g. pre-import empty) response.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view') // 'mine' | 'dueToday' | 'brokenPTP'
  const userId = (session.user as { id: string }).id

  const where: Prisma.RecoveryCaseWhereInput = {}
  if (view === 'mine') where.assignedOfficerId = userId
  if (view === 'dueToday') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    where.nextActionDate = { gte: today, lt: tomorrow }
  }
  // A broken promise: case is "Promised to pay" and the commitment date has
  // passed with no payment logged against it since.
  if (view === 'brokenPTP') {
    where.status = 'Promised to pay'
    where.nextActionDate = { lt: new Date() }
  }
  if (view === 'legal') where.status = 'Legal'

  const cases = await prisma.recoveryCase.findMany({
    where,
    include: {
      loan: true,
      officer: true,
      actions: { orderBy: { timestamp: 'desc' }, take: 5 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  const now = new Date()
  const casesWithFlags = cases.map((c) => {
    const isBrokenPromise =
      c.status === 'Promised to pay' &&
      !!c.nextActionDate &&
      c.nextActionDate < now &&
      !c.actions.some((a) => a.type === 'Payment received')
    return { ...c, isBrokenPromise }
  })

  return NextResponse.json({ cases: casesWithFlags })
}
