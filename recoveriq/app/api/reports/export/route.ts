import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'loans'
  const format = searchParams.get('format') ?? 'csv'

  let rows: Record<string, unknown>[] = []
  let filename = 'export'

  if (type === 'loans') {
    const loans = await prisma.loan.findMany()
    rows = loans.map((l: (typeof loans)[number]) => ({
      LoanNo: l.loanNo,
      Borrower: l.borrowerName,
      Product: l.product,
      Outstanding: l.outstandingBalance,
      DaysInArrears: l.daysInArrears,
      Classification: l.classification,
      RecoveryTier: l.recoveryTier,
      ArrearsBucket: l.arrearsBucket,
    }))
    filename = 'loan_book_export'
  } else if (type === 'aging') {
    const loans = await prisma.loan.findMany()
    const buckets: Record<string, { count: number; outstanding: number }> = {}
    for (const l of loans) {
      const b = l.arrearsBucket ?? 'Unknown'
      buckets[b] ??= { count: 0, outstanding: 0 }
      buckets[b].count++
      buckets[b].outstanding += Number(l.outstandingBalance)
    }
    rows = Object.entries(buckets).map(([bucket, v]) => ({
      ArrearsBucket: bucket,
      AccountCount: v.count,
      OutstandingKES: v.outstanding.toFixed(2),
    }))
    filename = 'cbk_aging_report'
  } else if (type === 'officer-performance') {
    const actions = await prisma.recoveryAction.findMany({
      include: { officer: true },
      where: { type: 'Payment received' },
    })
    const byOfficer: Record<string, { name: string; count: number; total: number }> = {}
    for (const a of actions) {
      byOfficer[a.officerId] ??= { name: a.officer.name, count: 0, total: 0 }
      byOfficer[a.officerId].count++
      byOfficer[a.officerId].total += Number(a.amountReceived ?? 0)
    }
    rows = Object.values(byOfficer).map((v) => ({
      Officer: v.name,
      PaymentsLogged: v.count,
      TotalRecoveredKES: v.total.toFixed(2),
    }))
    filename = 'officer_performance_report'
  }

  const ws = XLSX.utils.json_to_sheet(rows)

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    })
  }

  const csv = XLSX.utils.sheet_to_csv(ws)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}
