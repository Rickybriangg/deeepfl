import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporary diagnostic endpoint: attempts a trivial DB query and returns the
// exact underlying error so we can see WHY Postgres is closing the connection
// (SSL, auth, connection reset, wrong host, etc). Remove once login works.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = await prisma.$queryRaw`SELECT 1 as ok`
    const userCount = await prisma.user.count()
    return NextResponse.json({ ok: true, rows, userCount })
  } catch (err) {
    const e = err as Error & { code?: string; cause?: unknown }
    return NextResponse.json(
      {
        ok: false,
        name: e?.name,
        code: e?.code,
        message: e?.message,
        cause: e?.cause ? String((e.cause as Error)?.message ?? e.cause) : undefined,
        causeName: (e?.cause as Error)?.name,
      },
      { status: 500 },
    )
  }
}
