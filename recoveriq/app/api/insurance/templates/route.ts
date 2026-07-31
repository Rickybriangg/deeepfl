import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  COVERAGE_TYPES,
  COVERAGE_BASES,
  DEFAULT_INSURANCE_TEMPLATES,
} from '@/lib/insurance'

export const dynamic = 'force-dynamic'

function isManager(role: string | undefined) {
  return role === 'Admin' || role === 'Manager' || role === 'Superadmin'
}

// Seeds the default insurance templates on first read so the feature is usable
// out of the box, then returns the full list plus the option vocabularies.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const count = await prisma.insuranceTemplate.count()
  if (count === 0) {
    await prisma.insuranceTemplate.createMany({ data: DEFAULT_INSURANCE_TEMPLATES })
  }

  const templates = await prisma.insuranceTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { policies: true } } },
  })

  return NextResponse.json({
    templates,
    coverageTypes: COVERAGE_TYPES,
    coverageBases: COVERAGE_BASES,
  })
}

const percentString = z
  .string()
  .refine((v) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 && n <= 100
  }, 'Must be a number between 0 and 100')

const createSchema = z.object({
  name: z.string().min(1).max(120),
  provider: z.string().max(120).optional().nullable(),
  coverageType: z.enum(['credit-life', 'asset', 'portfolio', 'credit-guarantee', 'other']),
  coverageBasis: z.enum(['outstanding', 'disbursed', 'approved']),
  coveragePercent: percentString,
  premiumRate: percentString,
  termMonths: z.number().int().positive().max(600).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  enabled: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !isManager(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.insuranceTemplate.findUnique({
    where: { name: parsed.data.name },
  })
  if (existing) {
    return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 })
  }

  const created = await prisma.insuranceTemplate.create({
    data: {
      name: parsed.data.name,
      provider: parsed.data.provider ?? null,
      coverageType: parsed.data.coverageType,
      coverageBasis: parsed.data.coverageBasis,
      coveragePercent: parsed.data.coveragePercent,
      premiumRate: parsed.data.premiumRate,
      termMonths: parsed.data.termMonths ?? null,
      description: parsed.data.description ?? null,
      enabled: parsed.data.enabled ?? true,
    },
  })

  const actorId = (session.user as { id?: string }).id
  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'INSURANCE_TEMPLATE_CREATED',
        entity: 'InsuranceTemplate',
        entityId: created.id,
        after: JSON.stringify(created),
      },
    })
  }

  return NextResponse.json(created, { status: 201 })
}

const updateSchema = createSchema.partial().extend({ id: z.string().min(1) })

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !isManager(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { id, ...rest } = parsed.data

  const before = await prisma.insuranceTemplate.findUnique({ where: { id } })
  if (!before) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const updated = await prisma.insuranceTemplate.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.provider !== undefined ? { provider: rest.provider } : {}),
      ...(rest.coverageType !== undefined ? { coverageType: rest.coverageType } : {}),
      ...(rest.coverageBasis !== undefined ? { coverageBasis: rest.coverageBasis } : {}),
      ...(rest.coveragePercent !== undefined ? { coveragePercent: rest.coveragePercent } : {}),
      ...(rest.premiumRate !== undefined ? { premiumRate: rest.premiumRate } : {}),
      ...(rest.termMonths !== undefined ? { termMonths: rest.termMonths } : {}),
      ...(rest.description !== undefined ? { description: rest.description } : {}),
      ...(rest.enabled !== undefined ? { enabled: rest.enabled } : {}),
    },
  })

  const actorId = (session.user as { id?: string }).id
  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'INSURANCE_TEMPLATE_UPDATED',
        entity: 'InsuranceTemplate',
        entityId: id,
        before: JSON.stringify(before),
        after: JSON.stringify(updated),
      },
    })
  }

  return NextResponse.json(updated)
}
