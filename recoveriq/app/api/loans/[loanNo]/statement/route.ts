import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildLoanStatement } from '@/lib/statement'

// Always reflect live data; a statement must never be served from cache.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/loans/{loanNo}/statement
// Returns a structured loan statement: header, summary, a chronological ledger
// with running balance, and the installment schedule.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ loanNo: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { loanNo: raw } = await params
  const loanNo = decodeURIComponent(raw)

  const loan = await prisma.loan.findUnique({
    where: { loanNo },
    include: {
      recoveryCase: {
        include: {
          actions: {
            where: { type: 'Payment received' },
            orderBy: { timestamp: 'asc' },
          },
          installments: true,
        },
      },
    },
  })

  if (!loan) {
    return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
  }

  const payments = (loan.recoveryCase?.actions ?? []).map((a) => ({
    id: a.id,
    amountReceived: a.amountReceived,
    timestamp: a.timestamp,
    description: a.notes ?? a.outcome ?? null,
  }))

  const installments = (loan.recoveryCase?.installments ?? []).map((i) => ({
    id: i.id,
    dueDate: i.dueDate,
    amount: i.amount,
    status: i.status,
    paidDate: i.paidDate,
    paidAmount: i.paidAmount,
  }))

  const statement = buildLoanStatement(
    {
      loanNo: loan.loanNo,
      borrowerName: loan.borrowerName,
      memberNo: loan.memberNo,
      product: loan.product,
      branch: loan.branch,
      countyCode: loan.countyCode,
      classification: loan.classification,
      arrearsBucket: loan.arrearsBucket,
      recoveryTier: loan.recoveryTier,
      daysInArrears: loan.daysInArrears,
      disbursementDate: loan.disbursementDate,
      repaymentStartDate: loan.repaymentStartDate,
      expectedCompletionDate: loan.expectedCompletionDate,
      lastPayDate: loan.lastPayDate,
      approvedAmount: loan.approvedAmount,
      disbursedAmount: loan.disbursedAmount,
      totalPaid: loan.totalPaid,
      outstandingBalance: loan.outstandingBalance,
    },
    payments,
    installments,
    new Date()
  )

  return NextResponse.json(statement)
}
