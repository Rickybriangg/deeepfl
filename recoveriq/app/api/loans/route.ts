import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Always read live data; never serve a cached (e.g. pre-import empty) response.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const worklist = searchParams.get('worklist')
  const product = searchParams.get('product')
  const county = searchParams.get('county')
  const search = searchParams.get('search')?.trim()
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10)

  const where: Record<string, unknown> = {}

  if (product) where.product = product
  if (county) where.countyCode = parseInt(county, 10)
  if (search) {
    where.OR = [
      { loanNo: { contains: search, mode: 'insensitive' } },
      { borrowerName: { contains: search, mode: 'insensitive' } },
      { memberNo: { contains: search, mode: 'insensitive' } },
    ]
  }

  switch (worklist) {
    case 'doubtful':
      where.recoveryTier = 'Doubtful'
      break
    case 'dormant365':
      where.dormancyDays = { gte: 365 }
      break
    case 'matured':
      where.isMatured = true
      break
    case 'creditBalances':
      where.isCreditBalance = true
      break
    case 'highestExposure':
      // sorted below; no extra filter
      break
    default:
      break
  }

  const orderBy =
    worklist === 'highestExposure'
      ? [{ outstandingBalance: 'desc' as const }]
      : [{ daysInArrears: 'desc' as const }]

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { recoveryCase: { include: { officer: true } } },
    }),
    prisma.loan.count({ where }),
  ])

  return NextResponse.json({ loans, total, page, pageSize })
}
