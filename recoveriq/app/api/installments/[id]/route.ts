import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, paidAmount } = body as { status: 'Pending' | 'Paid' | 'Overdue'; paidAmount?: string }

  const installment = await prisma.installment.update({
    where: { id },
    data: {
      status,
      paidDate: status === 'Paid' ? new Date() : null,
      paidAmount: status === 'Paid' ? paidAmount ?? null : null,
    },
  })
  return NextResponse.json(installment)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.installment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
