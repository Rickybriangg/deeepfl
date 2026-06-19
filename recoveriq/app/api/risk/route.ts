import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { computeRiskScore, predictRecovery, type RiskBand } from '@/lib/recovery-logic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Scores every loan with the in-house rules-based risk engine (1.7) and
// the heuristic predictive engine (1.8). No external API involved.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const band = searchParams.get('band') // optional filter

  const [loans, riskSettings] = await Promise.all([
    prisma.loan.findMany({
      include: { recoveryCase: { include: { actions: { take: 20, orderBy: { timestamp: 'desc' } } } } },
    }),
    prisma.riskSettings.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }),
  ])

  const thresholds = {
    mediumMin: riskSettings.mediumMin,
    highMin: riskSettings.highMin,
    criticalMin: riskSettings.criticalMin,
  }
  const strategies = {
    Low: riskSettings.strategyLow,
    Medium: riskSettings.strategyMedium,
    High: riskSettings.strategyHigh,
    Critical: riskSettings.strategyCritical,
  }

  const scored = loans.map((l) => {
    // Count broken promises from the case's action history (auto-escalated notes).
    const brokenPromises =
      l.recoveryCase?.actions.filter((a) => a.outcome?.includes('PTP broken')).length ?? 0

    const risk = computeRiskScore(
      {
        daysInArrears: l.daysInArrears,
        classification: l.classification,
        dormancyDays: l.dormancyDays,
        outstandingBalance: l.outstandingBalance,
        disbursedAmount: l.disbursedAmount,
        brokenPromises,
      },
      thresholds
    )
    const prediction = predictRecovery(risk, l.outstandingBalance, strategies)

    return {
      loanNo: l.loanNo,
      borrowerName: l.borrowerName,
      product: l.product,
      outstandingBalance: l.outstandingBalance,
      daysInArrears: l.daysInArrears,
      classification: l.classification,
      score: risk.score,
      band: risk.band,
      factors: risk.factors,
      paymentProbability: prediction.paymentProbability,
      recommendedStrategy: prediction.recommendedStrategy,
      priority: prediction.priority,
    }
  })

  const filtered = band ? scored.filter((s) => s.band === band) : scored
  filtered.sort((a, b) => b.priority - a.priority)

  // Band distribution summary.
  const distribution: Record<RiskBand, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 }
  for (const s of scored) distribution[s.band]++

  // Portfolio-level monthly collections forecast (roadmap 1.8): each loan's
  // outstanding balance weighted by its predicted payment probability,
  // summed across the book — a rough expected-collections-this-month figure.
  const forecastMonthlyCollections = scored
    .reduce((sum, s) => {
      try {
        return sum.plus(new Decimal(s.outstandingBalance).times(s.paymentProbability / 100))
      } catch {
        return sum
      }
    }, new Decimal(0))
    .toFixed(2)

  return NextResponse.json({ distribution, forecastMonthlyCollections, rows: filtered.slice(0, 200) })
}
