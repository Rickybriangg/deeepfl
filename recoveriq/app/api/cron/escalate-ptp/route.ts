import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Invoked daily by the Vercel cron defined in vercel.json. Finds broken
// Promise-to-Pay commitments (commitment date passed, no payment logged
// since) and escalates them automatically, per roadmap item 1.6.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const candidates = await prisma.recoveryCase.findMany({
    where: {
      status: 'Promised to pay',
      nextActionDate: { lt: new Date() },
      assignedOfficerId: { not: null },
      priorityTier: { not: 'PTP Broken' },
    },
    include: { actions: { orderBy: { timestamp: 'desc' }, take: 5 } },
  })

  let escalated = 0
  for (const c of candidates) {
    if (c.actions.some((a) => a.type === 'Payment received')) continue

    await prisma.recoveryCase.update({
      where: { id: c.id },
      data: { priorityTier: 'PTP Broken' },
    })
    await prisma.recoveryAction.create({
      data: {
        caseId: c.id,
        officerId: c.assignedOfficerId!,
        type: 'Note',
        outcome: 'PTP broken — auto-escalated',
        notes: `Commitment date ${c.nextActionDate?.toISOString().slice(0, 10)} passed with no payment logged.`,
      },
    })
    await prisma.auditLog.create({
      data: {
        actorId: c.assignedOfficerId!,
        action: 'PTP_AUTO_ESCALATED',
        entity: 'RecoveryCase',
        entityId: c.id,
        before: JSON.stringify({ priorityTier: c.priorityTier }),
        after: JSON.stringify({ priorityTier: 'PTP Broken' }),
      },
    })
    escalated++
  }

  return NextResponse.json({ checked: candidates.length, escalated })
}
