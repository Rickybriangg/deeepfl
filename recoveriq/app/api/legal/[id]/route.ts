import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  status: z.enum(['Draft', 'Sent', 'Filed', 'In court', 'Resolved', 'Closed']).optional(),
  lawyerName: z.string().optional(),
  courtName: z.string().optional(),
  filingDate: z.string().optional(),
  hearingDate: z.string().optional(),
  resolutionDate: z.string().optional(),
  notes: z.string().optional(),
  documentRef: z.string().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Manager' && role !== 'Superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const data = parsed.data

  const before = await prisma.legalCase.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.legalCase.update({
    where: { id },
    data: {
      status: data.status,
      lawyerName: data.lawyerName,
      courtName: data.courtName,
      filingDate: data.filingDate ? new Date(data.filingDate) : undefined,
      hearingDate: data.hearingDate ? new Date(data.hearingDate) : undefined,
      resolutionDate: data.resolutionDate ? new Date(data.resolutionDate) : undefined,
      notes: data.notes,
      documentRef: data.documentRef,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'LEGAL_CASE_UPDATED',
      entity: 'LegalCase',
      entityId: id,
      before: JSON.stringify({ status: before.status }),
      after: JSON.stringify({ status: updated.status }),
    },
  })

  return NextResponse.json({ legalCase: updated })
}
