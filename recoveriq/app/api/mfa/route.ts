import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTotpSecret, buildOtpAuthUri, verifyTotp } from '@/lib/totp'

export const dynamic = 'force-dynamic'

// GET: current MFA status for the signed-in user.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: { mfaEnabled: true },
  })
  return NextResponse.json({ mfaEnabled: user?.mfaEnabled ?? false })
}

// POST: begin enrollment — generate (or regenerate) a secret and return the
// provisioning URI. Does NOT enable MFA until a code is verified via PUT.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const email = session.user?.email ?? 'user'
  const secret = generateTotpSecret()

  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret, mfaEnabled: false } })

  return NextResponse.json({ secret, otpauthUri: buildOtpAuthUri(secret, email) })
}

const verifySchema = z.object({ token: z.string().min(6), action: z.enum(['enable', 'disable']) })

// PUT: verify a code and enable or disable MFA.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = verifySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const userId = (session.user as { id: string }).id
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.mfaSecret) return NextResponse.json({ error: 'No enrollment in progress' }, { status: 400 })

  if (!verifyTotp(user.mfaSecret, parsed.data.token)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  const enable = parsed.data.action === 'enable'
  await prisma.user.update({
    where: { id: userId },
    data: enable ? { mfaEnabled: true } : { mfaEnabled: false, mfaSecret: null },
  })

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: enable ? 'MFA_ENABLED' : 'MFA_DISABLED',
      entity: 'User',
      entityId: userId,
      after: JSON.stringify({ mfaEnabled: enable }),
    },
  })

  return NextResponse.json({ mfaEnabled: enable })
}
