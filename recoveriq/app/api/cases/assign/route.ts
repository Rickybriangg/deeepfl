import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  loanNos: z.array(z.string()).min(1),
  officerId: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { loanNos, officerId } = parsed.data
  const actorId = (session.user as { id: string }).id

  let assigned = 0
  for (const loanNo of loanNos) {
    const existing = await prisma.recoveryCase.findUnique({ where: { loanNo } })
    if (existing) {
      await prisma.recoveryCase.update({
        where: { loanNo },
        data: { assignedOfficerId: officerId },
      })
    } else {
      await prisma.recoveryCase.create({
        data: { loanNo, assignedOfficerId: officerId, status: 'New' },
      })
    }
    assigned++
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'BULK_ASSIGN',
      entity: 'RecoveryCase',
      after: JSON.stringify({ loanNos, officerId, count: assigned }),
    },
  })

  return NextResponse.json({ assigned })
}
