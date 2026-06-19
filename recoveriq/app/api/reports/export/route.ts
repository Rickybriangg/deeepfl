import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Always read live data; exporting a large book can be slow.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
  } else if (type === 'overdue-analysis') {
    const loans = await prisma.loan.findMany({ where: { daysInArrears: { gt: 0 } } })
    rows = loans.map((l) => ({
      LoanNo: l.loanNo,
      Borrower: l.borrowerName,
      Product: l.product,
      Outstanding: l.outstandingBalance,
      DaysInArrears: l.daysInArrears,
      ArrearsBucket: l.arrearsBucket,
      Classification: l.classification,
    }))
    filename = 'overdue_analysis_report'
  } else if (type === 'default-report') {
    const loans = await prisma.loan.findMany({ where: { daysInArrears: { gt: 180 } } })
    rows = loans.map((l) => ({
      LoanNo: l.loanNo,
      Borrower: l.borrowerName,
      Product: l.product,
      Outstanding: l.outstandingBalance,
      DaysInArrears: l.daysInArrears,
      Classification: l.classification,
    }))
    filename = 'default_report'
  } else if (type === 'portfolio-risk') {
    const loans = await prisma.loan.findMany()
    const buckets: Record<string, { count: number; outstanding: number }> = {}
    for (const l of loans) {
      const tier = l.recoveryTier ?? 'Unknown'
      buckets[tier] ??= { count: 0, outstanding: 0 }
      buckets[tier].count++
      buckets[tier].outstanding += Number(l.outstandingBalance)
    }
    rows = Object.entries(buckets).map(([tier, v]) => ({
      RecoveryTier: tier,
      AccountCount: v.count,
      OutstandingKES: v.outstanding.toFixed(2),
    }))
    filename = 'portfolio_risk_report'
  } else if (type === 'recovery-trend') {
    const snapshots = await prisma.portfolioSnapshot.findMany({
      orderBy: { capturedAt: 'asc' },
      take: 90,
    })
    rows = snapshots.map((s) => ({
      Date: s.capturedAt.toISOString().slice(0, 10),
      TotalOutstanding: s.totalOutstanding,
      TotalOverdue: s.totalOverdue,
      RecoveryRatePct: s.recoveryRate?.toFixed(2) ?? '',
      Par30Pct: s.par30?.toFixed(2) ?? '',
      DefaultRatePct: s.defaultRate?.toFixed(2) ?? '',
    }))
    filename = 'recovery_trend_report'
  } else if (type === 'branch-comparison') {
    const loans = await prisma.loan.findMany({ where: { branch: { not: null } } })
    const branches: Record<string, { count: number; outstanding: number }> = {}
    for (const l of loans) {
      const b = l.branch ?? 'Unknown'
      branches[b] ??= { count: 0, outstanding: 0 }
      branches[b].count++
      branches[b].outstanding += Number(l.outstandingBalance)
    }
    rows = Object.entries(branches).map(([branch, v]) => ({
      Branch: branch,
      AccountCount: v.count,
      OutstandingKES: v.outstanding.toFixed(2),
    }))
    filename = 'branch_comparison_report'
  } else if (type === 'daily-collection') {
    const actions = await prisma.recoveryAction.findMany({
      where: { type: 'Payment received' },
      orderBy: { timestamp: 'asc' },
    })
    const byDay: Record<string, { count: number; total: number }> = {}
    for (const a of actions) {
      const day = a.timestamp.toISOString().slice(0, 10)
      byDay[day] ??= { count: 0, total: 0 }
      byDay[day].count++
      byDay[day].total += Number(a.amountReceived ?? 0)
    }
    rows = Object.entries(byDay).map(([day, v]) => ({
      Date: day,
      PaymentsLogged: v.count,
      TotalCollectedKES: v.total.toFixed(2),
    }))
    filename = 'daily_collection_report'
  }

  if (format === 'json') {
    return NextResponse.json(rows)
  }

  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(filename.replace(/_/g, ' '), 14, 15)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    autoTable(doc, {
      head: [columns],
      body: rows.map((r) => columns.map((c) => String(r[c] ?? ''))),
      startY: 20,
      styles: { fontSize: 8 },
    })
    const buf = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
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
