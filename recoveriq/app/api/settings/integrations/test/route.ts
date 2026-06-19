import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { INTEGRATIONS } from '@/lib/integrations'

export const dynamic = 'force-dynamic'

// Stub connection test: confirms credentials are saved (no real provider
// call yet, since no live API keys have been supplied for any integration).
// Once a provider's credentials are entered, this should be replaced with
// an actual handshake call for that integration.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || role !== 'Superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { key } = await req.json()
  const def = INTEGRATIONS.find((d) => d.key === key)
  if (!def) return NextResponse.json({ error: 'Unknown integration' }, { status: 400 })

  const row = await prisma.integrationSetting.findUnique({ where: { key } })
  if (!row?.config) {
    return NextResponse.json({ error: 'No credentials saved for this integration' }, { status: 400 })
  }

  const verifiedAt = new Date()
  await prisma.integrationSetting.update({ where: { key }, data: { lastVerifiedAt: verifiedAt } })

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'INTEGRATION_CONNECTION_TESTED',
      entity: 'IntegrationSetting',
      entityId: row.id,
      before: null,
      after: JSON.stringify({ key }),
    },
  })

  return NextResponse.json({ key, lastVerifiedAt: verifiedAt })
}
