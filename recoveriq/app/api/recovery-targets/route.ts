import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isManager(role: string | undefined) {
  return role === 'Admin' || role === 'Manager' || role === 'Superadmin'
}

// Returns each Officer's target for the requested period alongside actual
// collections (sum of "Payment received" RecoveryAction.amountReceived
// logged by that officer within the period).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  const userId = (session.user as { id: string }).id
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? currentPeriod()

  const [year, month] = period.split('-').map(Number)
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 1)

  const officers = await prisma.user.findMany({
    where: { role: 'Officer', ...(isManager(role) ? {} : { id: userId }) },
    select: { id: true, name: true },
  })

  const targets = await prisma.recoveryTarget.findMany({ where: { periodMonth: period } })
  const targetByOfficer = new Map(targets.map((t) => [t.officerId, t]))

  const actions = await prisma.recoveryAction.findMany({
    where: {
      type: 'Payment received',
      timestamp: { gte: periodStart, lt: periodEnd },
      officerId: { in: officers.map((o) => o.id) },
    },
  })
  const actualByOfficer = new Map<string, number>()
  for (const a of actions) {
    actualByOfficer.set(a.officerId, (actualByOfficer.get(a.officerId) ?? 0) + Number(a.amountReceived ?? 0))
  }

  const result = officers.map((o) => ({
    officerId: o.id,
    officerName: o.name,
    period,
    targetAmount: targetByOfficer.get(o.id)?.targetAmount ?? null,
    actualAmount: actualByOfficer.get(o.id) ?? 0,
  }))

  return NextResponse.json(result)
}

const setSchema = z.object({
  officerId: z.string(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  targetAmount: z.string(),
})

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !isManager(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = setSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { officerId, period, targetAmount } = parsed.data

  const before = await prisma.recoveryTarget.findUnique({
    where: { officerId_periodMonth: { officerId, periodMonth: period } },
  })

  const updated = await prisma.recoveryTarget.upsert({
    where: { officerId_periodMonth: { officerId, periodMonth: period } },
    update: { targetAmount },
    create: { officerId, periodMonth: period, targetAmount },
  })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'RECOVERY_TARGET_SET',
      entity: 'RecoveryTarget',
      entityId: updated.id,
      before: before ? JSON.stringify({ targetAmount: before.targetAmount }) : null,
      after: JSON.stringify({ targetAmount }),
    },
  })

  return NextResponse.json(updated)
}
