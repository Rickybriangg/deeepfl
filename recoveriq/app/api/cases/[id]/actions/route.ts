import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
