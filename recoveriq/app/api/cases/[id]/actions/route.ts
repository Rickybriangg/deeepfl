import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import Decimal from 'decimal.js'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeArrearsBucket } from '@/lib/recovery-logic'

const schema = z.object({
  type: z.enum([
    'Call', 'SMS', 'Demand letter', 'Field visit', 'Restructure offer',
    'Guarantor contact', 'CRB listing', 'Legal', 'Payment received', 'Note',
  ]),
  outcome: z.string().optional(),
  amountPromised: z.string().optional(),
  amountReceived: z.string().optional(),
  notes: z.string().optional(),
  newStatus: z.string().optional(),
  nextActionDate: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const officerId = (session.user as { id: string }).id
  const data = parsed.data

  const action = await prisma.recoveryAction.create({
    data: {
      caseId: id,
      officerId,
      type: data.type,
      outcome: data.outcome,
      amountPromised: data.amountPromised,
      amountReceived: data.amountReceived,
      notes: data.notes,
    },
  })

  // Payment reconciliation (roadmap 1.11): a logged payment reduces the loan's
  // outstanding balance and increases total paid. If the balance clears, the
  // case is auto-marked Recovered. No external gateway involved — this records
  // and reconciles payments captured manually or imported.
  if (data.type === 'Payment received' && data.amountReceived) {
    const recoveryCase = await prisma.recoveryCase.findUnique({ where: { id } })
    if (recoveryCase) {
      const loan = await prisma.loan.findUnique({ where: { loanNo: recoveryCase.loanNo } })
      if (loan) {
        try {
          const paid = new Decimal(data.amountReceived)
          if (paid.gt(0)) {
            const prevOutstanding = new Decimal(loan.outstandingBalance)
            const newOutstanding = Decimal.max(prevOutstanding.minus(paid), new Decimal(0))
            const newTotalPaid = new Decimal(loan.totalPaid).plus(paid)
            const cleared = newOutstanding.lte(0)

            await prisma.loan.update({
              where: { loanNo: loan.loanNo },
              data: {
                outstandingBalance: newOutstanding.toString(),
                totalPaid: newTotalPaid.toString(),
                ...(cleared
                  ? { daysInArrears: 0, arrearsBucket: computeArrearsBucket(0) }
                  : {}),
              },
            })

            if (cleared && !['Recovered', 'Closed', 'Written-off'].includes(recoveryCase.status)) {
              await prisma.recoveryCase.update({ where: { id }, data: { status: 'Recovered' } })
            }

            // Close installments (roadmap 1.11): apply the payment against the
            // manually-entered schedule, oldest-due-first, marking each fully
            // covered installment Paid until the payment is exhausted.
            let remaining = paid
            const pendingInstallments = await prisma.installment.findMany({
              where: { caseId: id, status: { not: 'Paid' } },
              orderBy: { dueDate: 'asc' },
            })
            for (const inst of pendingInstallments) {
              if (remaining.lte(0)) break
              const due = new Decimal(inst.amount)
              if (remaining.gte(due)) {
                await prisma.installment.update({
                  where: { id: inst.id },
                  data: { status: 'Paid', paidDate: new Date(), paidAmount: due.toString() },
                })
                remaining = remaining.minus(due)
              }
            }

            await prisma.auditLog.create({
              data: {
                actorId: officerId,
                action: 'PAYMENT_RECONCILED',
                entity: 'Loan',
                entityId: loan.loanNo,
                before: JSON.stringify({ outstandingBalance: prevOutstanding.toString() }),
                after: JSON.stringify({ outstandingBalance: newOutstanding.toString(), paid: paid.toString() }),
              },
            })
          }
        } catch {
          // malformed amount — skip reconciliation, the action is still logged
        }
      }
    }
  }

  if (data.newStatus || data.nextActionDate) {
    const before = await prisma.recoveryCase.findUnique({ where: { id } })
    await prisma.recoveryCase.update({
      where: { id },
      data: {
        status: data.newStatus ?? undefined,
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
      },
    })
    if (data.newStatus) {
      await prisma.auditLog.create({
        data: {
          actorId: officerId,
          action: 'CASE_STATUS_CHANGED',
          entity: 'RecoveryCase',
          entityId: id,
          before: JSON.stringify({ status: before?.status }),
          after: JSON.stringify({ status: data.newStatus }),
        },
      })
    }
  }

  return NextResponse.json({ action })
}
