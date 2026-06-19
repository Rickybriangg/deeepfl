import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Manually-entered repayment schedule (roadmap 1.2/1.9 "Track upcoming
// installments"). No interest rate / frequency exists in the import feed,
// so officers/admins enter due dates and amounts by hand per case.
const schema = z.object({
  dueDate: z.string(),
  amount: z.string(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const installments = await prisma.installment.findMany({
    where: { caseId: id },
    orderBy: { dueDate: 'asc' },
  })
  return NextResponse.json({ installments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const installment = await prisma.installment.create({
    data: {
      caseId: id,
      dueDate: new Date(parsed.data.dueDate),
      amount: parsed.data.amount,
    },
  })
  return NextResponse.json(installment)
}
