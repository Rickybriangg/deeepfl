import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { isNPL, computeDelinquencyStage } from '@/lib/recovery-logic'
import { getCountyName } from '@/lib/counties'

// Reads must always reflect the latest imported data (never a cached empty
// response), and the full-portfolio aggregation can be heavy on large books.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const product = searchParams.get('product')
  const county = searchParams.get('county')
  const classification = searchParams.get('classification')
  const tier = searchParams.get('tier')

  const where: Record<string, unknown> = {}
  if (product) where.product = product
  if (county) where.countyCode = parseInt(county, 10)
  if (classification) where.classification = classification
  if (tier) where.recoveryTier = tier

  const loans = await prisma.loan.findMany({ where })
  const activeCases = await prisma.recoveryCase.count({
    where: { status: { notIn: ['Recovered', 'Closed', 'Written-off'] } },
  })

  let totalOutstanding = new Decimal(0)
  let totalDisbursed = new Decimal(0)
  let totalPaid = new Decimal(0)
  let nplOutstanding = new Decimal(0)
  let par30Outstanding = new Decimal(0)
  let positiveOutstanding = new Decimal(0)

  const tierBreakdown: Record<string, { count: number; outstanding: Decimal }> = {}
  const classBreakdown: Record<string, { count: number; outstanding: Decimal }> = {}
  const productBreakdown: Record<
    string,
    { count: number; outstanding: Decimal; disbursed: Decimal; paid: Decimal }
  > = {}
  const arrearsBreakdown: Record<string, { count: number; outstanding: Decimal }> = {}
  const delinquencyBreakdown: Record<string, { count: number; outstanding: Decimal }> = {}
  const countyBreakdown: Record<string, { count: number; outstanding: Decimal }> = {}
  let dormant365 = 0
  let creditBalances = 0

  for (const loan of loans) {
    const outstanding = new Decimal(loan.outstandingBalance)
    const disbursed = new Decimal(loan.disbursedAmount)
    const paid = new Decimal(loan.totalPaid)

    totalOutstanding = totalOutstanding.plus(outstanding)
    totalDisbursed = totalDisbursed.plus(disbursed)
    totalPaid = totalPaid.plus(paid)

    if (outstanding.gt(0)) {
      positiveOutstanding = positiveOutstanding.plus(outstanding)
      if (isNPL(loan.classification as never)) {
        nplOutstanding = nplOutstanding.plus(outstanding)
      }
      if (loan.daysInArrears > 30) {
        par30Outstanding = par30Outstanding.plus(outstanding)
      }
    }

    const tierKey = loan.recoveryTier ?? 'Unknown'
    tierBreakdown[tierKey] ??= { count: 0, outstanding: new Decimal(0) }
    tierBreakdown[tierKey].count++
    tierBreakdown[tierKey].outstanding = tierBreakdown[tierKey].outstanding.plus(outstanding)

    classBreakdown[loan.classification] ??= { count: 0, outstanding: new Decimal(0) }
    classBreakdown[loan.classification].count++
    classBreakdown[loan.classification].outstanding = classBreakdown[
      loan.classification
    ].outstanding.plus(outstanding)

    productBreakdown[loan.product] ??= {
      count: 0,
      outstanding: new Decimal(0),
      disbursed: new Decimal(0),
      paid: new Decimal(0),
    }
    productBreakdown[loan.product].count++
    productBreakdown[loan.product].outstanding =
      productBreakdown[loan.product].outstanding.plus(outstanding)
    productBreakdown[loan.product].disbursed =
      productBreakdown[loan.product].disbursed.plus(disbursed)
    productBreakdown[loan.product].paid = productBreakdown[loan.product].paid.plus(paid)

    const bucketKey = loan.arrearsBucket ?? 'Unknown'
    arrearsBreakdown[bucketKey] ??= { count: 0, outstanding: new Decimal(0) }
    arrearsBreakdown[bucketKey].count++
    arrearsBreakdown[bucketKey].outstanding =
      arrearsBreakdown[bucketKey].outstanding.plus(outstanding)

    const stageKey = computeDelinquencyStage(loan.daysInArrears, {
      dueDate: loan.expectedCompletionDate,
    })
    delinquencyBreakdown[stageKey] ??= { count: 0, outstanding: new Decimal(0) }
    delinquencyBreakdown[stageKey].count++
    delinquencyBreakdown[stageKey].outstanding =
      delinquencyBreakdown[stageKey].outstanding.plus(outstanding)

    if (loan.countyCode) {
      const countyName = getCountyName(loan.countyCode)
      countyBreakdown[countyName] ??= { count: 0, outstanding: new Decimal(0) }
      countyBreakdown[countyName].count++
      countyBreakdown[countyName].outstanding =
        countyBreakdown[countyName].outstanding.plus(outstanding)
    }

    if ((loan.dormancyDays ?? 0) >= 365) dormant365++
    if (loan.isCreditBalance) creditBalances++
  }

  const recoveryRate = totalDisbursed.gt(0)
    ? totalPaid.div(totalDisbursed).mul(100).toNumber()
    : null
  const nplRatio = positiveOutstanding.gt(0)
    ? nplOutstanding.div(positiveOutstanding).mul(100).toNumber()
    : null
  const par30 = positiveOutstanding.gt(0)
    ? par30Outstanding.div(positiveOutstanding).mul(100).toNumber()
    : null

  function toObj(b: Record<string, { count: number; outstanding: Decimal }>) {
    return Object.fromEntries(
      Object.entries(b).map(([k, v]) => [
        k,
        { count: v.count, outstanding: v.outstanding.toFixed(2) },
      ])
    )
  }

  return NextResponse.json({
    totalOutstanding: totalOutstanding.toFixed(2),
    totalAccounts: loans.length,
    activeCases,
    recoveryRate,
    nplRatio,
    par30,
    dormant365,
    creditBalances,
    tierBreakdown: toObj(tierBreakdown),
    classificationBreakdown: toObj(classBreakdown),
    arrearsBreakdown: toObj(arrearsBreakdown),
    delinquencyBreakdown: toObj(delinquencyBreakdown),
    countyBreakdown: toObj(countyBreakdown),
    productBreakdown: Object.entries(productBreakdown).map(([product, v]) => ({
      product,
      count: v.count,
      outstanding: v.outstanding.toFixed(2),
      recoveryRate: v.disbursed.gt(0) ? v.paid.div(v.disbursed).mul(100).toNumber() : null,
    })),
  })
}
