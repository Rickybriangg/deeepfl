import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TERMINAL_STATUSES = ['Written-off', 'Recovered', 'Closed']

// Pluggable collector-assignment strategies (roadmap 1.13):
// - least_open_cases: round-robin to whoever has the fewest open cases (default).
// - branch_match: prefer an officer whose region matches the loan's branch,
//   falling back to least_open_cases among the matching pool, or the whole
//   officer pool if no branch match exists.
async function pickOfficer(strategy: string, loanBranch: string | null): Promise<string | null> {
  const officers = await prisma.user.findMany({ where: { role: 'Officer' } })
  if (officers.length === 0) return null

  let pool = officers
  if (strategy === 'branch_match' && loanBranch) {
    const matching = officers.filter((o) => o.region === loanBranch)
    if (matching.length > 0) pool = matching
  }

  const counts = await Promise.all(
    pool.map(async (o) => ({
      id: o.id,
      count: await prisma.recoveryCase.count({
        where: { assignedOfficerId: o.id, status: { notIn: TERMINAL_STATUSES } },
      }),
    }))
  )
  counts.sort((a, b) => a.count - b.count)
  return counts[0].id
}

// Invoked daily by the Vercel cron defined in vercel.json. Drives the
// Collection Workflow Automation (roadmap 1.4) from admin-configurable
// AutomationRule thresholds (roadmap 1.13): every overdue loan's case is
// advanced to the level matching its days-in-arrears, and the level's
// action is applied exactly once per transition.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rules = await prisma.automationRule.findMany({
    where: { enabled: true },
    orderBy: { level: 'asc' },
  })
  if (rules.length === 0) {
    return NextResponse.json({ checked: 0, advanced: 0, note: 'No enabled automation rules' })
  }

  const loans = await prisma.loan.findMany({
    where: { daysInArrears: { gt: 0 } },
    include: { recoveryCase: true },
  })

  const systemActor = await prisma.user.findFirst({ where: { role: 'Admin' } })
  if (!systemActor) {
    return NextResponse.json({ checked: loans.length, advanced: 0, note: 'No Admin user to attribute actions to' })
  }

  let advanced = 0
  for (const loan of loans) {
    const rule = rules.find(
      (r) =>
        loan.daysInArrears >= r.minDaysInArrears &&
        (r.maxDaysInArrears === null || loan.daysInArrears <= r.maxDaysInArrears)
    )
    if (!rule) continue

    let recoveryCase = loan.recoveryCase
    if (!recoveryCase) {
      recoveryCase = await prisma.recoveryCase.create({
        data: { loanNo: loan.loanNo },
      })
    }

    if (recoveryCase.workflowLevel === rule.level) continue
    if (TERMINAL_STATUSES.includes(recoveryCase.status)) continue

    const before = { workflowLevel: recoveryCase.workflowLevel, status: recoveryCase.status, assignedOfficerId: recoveryCase.assignedOfficerId, priorityTier: recoveryCase.priorityTier }
    const data: Record<string, unknown> = { workflowLevel: rule.level }

    if (rule.action === 'assign_officer' && !recoveryCase.assignedOfficerId) {
      const officerId = await pickOfficer(rule.assignmentStrategy, loan.branch)
      if (officerId) data.assignedOfficerId = officerId
    } else if (rule.action === 'escalate_supervisor') {
      data.priorityTier = 'Supervisor Escalation'
    } else if (rule.action === 'escalate_legal') {
      data.status = 'Legal'
    }

    const updated = await prisma.recoveryCase.update({
      where: { id: recoveryCase.id },
      data,
    })

    await prisma.recoveryAction.create({
      data: {
        caseId: updated.id,
        officerId: updated.assignedOfficerId ?? systemActor.id,
        type: 'Note',
        outcome: `Workflow Level ${rule.level} — ${rule.label}`,
        notes: `Auto-advanced from days-in-arrears ${loan.daysInArrears}.`,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: updated.assignedOfficerId ?? systemActor.id,
        action: 'WORKFLOW_LEVEL_ADVANCED',
        entity: 'RecoveryCase',
        entityId: updated.id,
        before: JSON.stringify(before),
        after: JSON.stringify({ workflowLevel: updated.workflowLevel, status: updated.status, assignedOfficerId: updated.assignedOfficerId, priorityTier: updated.priorityTier }),
      },
    })

    advanced++
  }

  return NextResponse.json({ checked: loans.length, advanced })
}
