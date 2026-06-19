import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Admin-configurable risk-band thresholds & recommended strategies
// (roadmap 1.13 "Risk thresholds" / "Recovery strategies").
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.riskSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  })
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { mediumMin, highMin, criticalMin, strategyLow, strategyMedium, strategyHigh, strategyCritical } = body

  const before = await prisma.riskSettings.findUnique({ where: { id: 'default' } })
  const updated = await prisma.riskSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', mediumMin, highMin, criticalMin, strategyLow, strategyMedium, strategyHigh, strategyCritical },
    update: { mediumMin, highMin, criticalMin, strategyLow, strategyMedium, strategyHigh, strategyCritical },
  })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'RISK_SETTINGS_UPDATED',
      entity: 'RiskSettings',
      entityId: updated.id,
      before: JSON.stringify(before),
      after: JSON.stringify(updated),
    },
  })

  return NextResponse.json(updated)
}
