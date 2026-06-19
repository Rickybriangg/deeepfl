import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REMINDER_STAGES, DEFAULT_TEMPLATE_BODY } from '@/lib/reminder-engine'

export const dynamic = 'force-dynamic'

function isManager(role: string | undefined) {
  return role === 'Admin' || role === 'Manager' || role === 'Superadmin'
}

// Seeds the internal-channel templates from defaults on first read so the
// engine is usable out of the box without external credentials.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.reminderTemplate.count({ where: { channel: 'internal' } })
  if (count === 0) {
    await prisma.reminderTemplate.createMany({
      data: REMINDER_STAGES.map((s) => ({
        channel: 'internal',
        stage: s.key,
        body: DEFAULT_TEMPLATE_BODY[s.key] ?? '',
      })),
    })
  }

  const templates = await prisma.reminderTemplate.findMany({ orderBy: [{ channel: 'asc' }, { stage: 'asc' }] })
  return NextResponse.json({ stages: REMINDER_STAGES, templates })
}

const upsertSchema = z.object({
  channel: z.string(),
  stage: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  enabled: z.boolean(),
})

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !isManager(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = upsertSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { channel, stage, subject, body, enabled } = parsed.data

  const updated = await prisma.reminderTemplate.upsert({
    where: { channel_stage: { channel, stage } },
    update: { subject, body, enabled },
    create: { channel, stage, subject, body, enabled },
  })

  return NextResponse.json(updated)
}
