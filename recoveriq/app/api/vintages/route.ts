import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseVintageSummary } from '@/lib/vintage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isManager(role: string | undefined) {
  return role === 'Admin' || role === 'Manager' || role === 'Superadmin'
}

// GET /api/vintages — list fiscal-year vintages (ascending by year).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vintages = await prisma.fiscalYearVintage.findMany({
    orderBy: { sortKey: 'asc' },
  })
  return NextResponse.json({ vintages })
}

const importSchema = z.object({
  filename: z.string(),
  fileBase64: z.string(),
})

// POST /api/vintages — import the FY summary sheet. Upserts one row per fiscal
// year (idempotent — re-importing refreshes the figures).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || !isManager(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = importSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const buffer = Buffer.from(parsed.data.fileBase64, 'base64')
  let rows
  try {
    rows = parseVintageSummary(buffer)
  } catch {
    return NextResponse.json({ error: 'Could not parse the SUMMARY sheet' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'No fiscal-year rows found in a SUMMARY sheet' },
      { status: 400 }
    )
  }

  for (const r of rows) {
    await prisma.fiscalYearVintage.upsert({
      where: { fiscalYear: r.fiscalYear },
      update: {
        sortKey: r.sortKey,
        approvedAmount: r.approvedAmount,
        outstandingBalance: r.outstandingBalance,
        amountDue: r.amountDue,
        amountRecovered: r.amountRecovered,
        recoveryRate: r.recoveryRate,
        loansIssued: r.loansIssued,
        isAggregate: r.isAggregate,
      },
      create: {
        fiscalYear: r.fiscalYear,
        sortKey: r.sortKey,
        approvedAmount: r.approvedAmount,
        outstandingBalance: r.outstandingBalance,
        amountDue: r.amountDue,
        amountRecovered: r.amountRecovered,
        recoveryRate: r.recoveryRate,
        loansIssued: r.loansIssued,
        isAggregate: r.isAggregate,
      },
    })
  }

  const actorId = (session.user as { id?: string }).id
  if (actorId) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'VINTAGE_IMPORT',
        entity: 'FiscalYearVintage',
        after: JSON.stringify({ filename: parsed.data.filename, rows: rows.length }),
      },
    })
  }

  return NextResponse.json({ imported: rows.length, vintages: rows })
}
