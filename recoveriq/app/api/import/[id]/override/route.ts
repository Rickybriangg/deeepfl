import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const bodySchema = z.object({ reason: z.string().min(10) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Superadmin')) {
    return NextResponse.json(
      { error: 'Only an Admin may override a failed reconciliation' },
      { status: 401 }
    )
  }

  const { id } = await params
  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const batch = await prisma.importBatch.findUnique({ where: { id } })
  if (!batch) {
    return NextResponse.json({ error: 'Import batch not found' }, { status: 404 })
  }

  const before = { reconciliationStatus: batch.reconciliationStatus }

  const updated = await prisma.importBatch.update({
    where: { id },
    data: {
      reconciliationStatus: 'Overridden',
      overrideReason: parsed.data.reason,
      overriddenById: (session.user as { id: string }).id,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'IMPORT_BATCH_OVERRIDDEN',
      entity: 'ImportBatch',
      entityId: id,
      before: JSON.stringify(before),
      after: JSON.stringify({
        reconciliationStatus: 'Overridden',
        reason: parsed.data.reason,
      }),
    },
  })

  return NextResponse.json({ batch: updated })
}
