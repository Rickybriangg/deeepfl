import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Always read live data — audit trail must never be served stale.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const entity = searchParams.get('entity')

  const where: Record<string, unknown> = {}
  if (action) where.action = action
  if (entity) where.entity = entity

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: true },
    orderBy: { timestamp: 'desc' },
    take: 200,
  })

  return NextResponse.json({ logs })
}
