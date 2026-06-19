import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptSecret } from '@/lib/crypto'
import { INTEGRATIONS } from '@/lib/integrations'

export const dynamic = 'force-dynamic'

function requireSuperadmin(session: { user?: unknown } | null) {
  const role = (session?.user as { role?: string } | undefined)?.role
  return !!session && role === 'Superadmin'
}

// Never returns decrypted credential values — only whether each integration
// has been configured and when it was last verified.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!requireSuperadmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.integrationSetting.findMany()
  const byKey = new Map(settings.map((s) => [s.key, s]))

  const result = INTEGRATIONS.map((def) => {
    const row = byKey.get(def.key)
    return {
      key: def.key,
      label: def.label,
      fields: def.fields,
      configured: !!row?.config,
      lastVerifiedAt: row?.lastVerifiedAt ?? null,
    }
  })

  return NextResponse.json(result)
}

// Body: { key: string, values: Record<string,string> }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!requireSuperadmin(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { key, values } = await req.json()
  const def = INTEGRATIONS.find((d) => d.key === key)
  if (!def) return NextResponse.json({ error: 'Unknown integration' }, { status: 400 })

  const actorId = (session!.user as { id: string }).id
  const encrypted = encryptSecret(JSON.stringify(values))

  const updated = await prisma.integrationSetting.upsert({
    where: { key },
    update: { config: encrypted, updatedById: actorId, lastVerifiedAt: null },
    create: { key, config: encrypted, updatedById: actorId },
  })

  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'INTEGRATION_CREDENTIALS_UPDATED',
      entity: 'IntegrationSetting',
      entityId: updated.id,
      before: null,
      after: JSON.stringify({ key, fields: Object.keys(values) }),
    },
  })

  return NextResponse.json({ key, configured: true, lastVerifiedAt: null })
}
