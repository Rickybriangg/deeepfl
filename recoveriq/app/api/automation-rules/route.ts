import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_RULES = [
  { level: 1, label: 'Friendly reminder', minDaysInArrears: 1, maxDaysInArrears: 7, action: 'notify' },
  { level: 2, label: 'Urgent notification', minDaysInArrears: 8, maxDaysInArrears: 30, action: 'notify' },
  { level: 3, label: 'Recovery officer assignment', minDaysInArrears: 31, maxDaysInArrears: 60, action: 'assign_officer' },
  { level: 4, label: 'Supervisor escalation', minDaysInArrears: 61, maxDaysInArrears: 90, action: 'escalate_supervisor' },
  { level: 5, label: 'Legal recovery escalation', minDaysInArrears: 91, maxDaysInArrears: null, action: 'escalate_legal' },
]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.automationRule.count()
  if (count === 0) {
    await prisma.automationRule.createMany({ data: DEFAULT_RULES })
  }

  const rules = await prisma.automationRule.findMany({ orderBy: { level: 'asc' } })
  return NextResponse.json(rules)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { level, label, minDaysInArrears, maxDaysInArrears, action, assignmentStrategy, enabled } = body

  const before = await prisma.automationRule.findUnique({ where: { level } })
  const updated = await prisma.automationRule.update({
    where: { level },
    data: { label, minDaysInArrears, maxDaysInArrears, action, assignmentStrategy, enabled },
  })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'AUTOMATION_RULE_UPDATED',
      entity: 'AutomationRule',
      entityId: updated.id,
      before: JSON.stringify(before),
      after: JSON.stringify(updated),
    },
  })

  return NextResponse.json(updated)
}
