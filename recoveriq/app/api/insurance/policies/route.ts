import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  computePolicyAmounts,
  makePolicyNo,
  type CoverageBasis,
} from '@/lib/insurance'

export const dynamic = 'force-dynamic'

function isManager(role: string | undefined) {
  return role === 'Admin' || role === 'Manager' || role === 'Superadmin'
}

// GET /api/insurance/policies[?loanNo=..&status=..]
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const loanNo = searchParams.get('loanNo')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (loanNo) where.loanNo = loanNo
  if (status) where.status = status

  const policies = await prisma.loanInsurance.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      template: { select: { name: true, coverageType: true, provider: true } },
      loan: { select: { borrowerName: true, product: true } },
    },
  })

  return NextResponse.json({ policies })
}

const insureSchema = z.object({
  loanNo: z.string().min(1),
  templateId: z.string().min(1),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

// POST /api/insurance/policies — insure a loan against a template. Rates are
// snapshotted from the template and amounts derived from the loan.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !isManager(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = insureSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { loanNo, templateId, endDate, notes } = parsed.data

  const [loan, template] = await Promise.all([
    prisma.loan.findUnique({ where: { loanNo } }),
    prisma.insuranceTemplate.findUnique({ where: { id: templateId } }),
  ])

  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
  if (!template) return NextResponse.json({ error: 'Insurance template not found' }, { status: 404 })
  if (!template.enabled) {
    return NextResponse.json({ error: 'This insurance template is disabled' }, { status: 400 })
  }

  // Prevent a duplicate active policy from the same template on the same loan.
  const existingActive = await prisma.loanInsurance.findFirst({
    where: { loanNo, templateId, status: 'active' },
  })
  if (existingActive) {
    return NextResponse.json(
      { error: 'This loan already has an active policy under that template' },
      { status: 409 }
    )
  }

  const basis = template.coverageBasis as CoverageBasis
  const amounts = computePolicyAmounts(
    basis,
    template.coveragePercent,
    template.premiumRate,
    {
      outstandingBalance: loan.outstandingBalance,
      disbursedAmount: loan.disbursedAmount,
      approvedAmount: loan.approvedAmount,
    }
  )

  const actorId = (session.user as { id: string }).id

  const policy = await prisma.loanInsurance.create({
    data: {
      loanNo,
      templateId,
      policyNo: makePolicyNo(loanNo, `${template.id}${Date.now()}`),
      status: 'active',
      coverageBasis: basis,
      coveragePercent: template.coveragePercent,
      premiumRate: template.premiumRate,
      insuredAmount: amounts.insuredAmount,
      premiumAmount: amounts.premiumAmount,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes ?? null,
      createdById: actorId,
    },
    include: { template: { select: { name: true, coverageType: true } } },
  })

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'LOAN_INSURED',
      entity: 'LoanInsurance',
      entityId: policy.id,
      after: JSON.stringify({
        loanNo,
        templateId,
        policyNo: policy.policyNo,
        insuredAmount: policy.insuredAmount,
        premiumAmount: policy.premiumAmount,
      }),
    },
  })

  return NextResponse.json(policy, { status: 201 })
}
