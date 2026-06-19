import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  caseId: z.string(),
  type: z.enum(['Demand Letter', 'Legal Notice', 'Court Case', 'Asset Repossession']),
  lawyerName: z.string().optional(),
  courtName: z.string().optional(),
  filingDate: z.string().optional(),
  hearingDate: z.string().optional(),
  notes: z.string().optional(),
  documentRef: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')

  const legalCases = await prisma.legalCase.findMany({
    where: caseId ? { caseId } : undefined,
    include: { case: { include: { loan: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ legalCases })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Manager' && role !== 'Superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const legalCase = await prisma.legalCase.create({
    data: {
      caseId: data.caseId,
      type: data.type,
      lawyerName: data.lawyerName,
      courtName: data.courtName,
      filingDate: data.filingDate ? new Date(data.filingDate) : undefined,
      hearingDate: data.hearingDate ? new Date(data.hearingDate) : undefined,
      notes: data.notes,
      documentRef: data.documentRef,
    },
  })

  await prisma.recoveryCase.update({
    where: { id: data.caseId },
    data: { status: 'Legal' },
  })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'LEGAL_CASE_CREATED',
      entity: 'LegalCase',
      entityId: legalCase.id,
      after: JSON.stringify({ type: data.type, caseId: data.caseId }),
    },
  })

  return NextResponse.json({ legalCase })
}
