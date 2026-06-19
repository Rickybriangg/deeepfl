import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Recent reminder activity + a status rollup for the Reminders page.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.reminderLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })

  const summary: Record<string, number> = {}
  for (const l of logs) summary[l.status] = (summary[l.status] ?? 0) + 1

  return NextResponse.json({ logs, summary })
}
