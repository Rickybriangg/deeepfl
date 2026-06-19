import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { workbookToJson, parseSheet, type ColumnMapping } from '@/lib/import-engine'
import { reconcileAll, allReconciled, type ControlTotal } from '@/lib/reconciliation'
import {
  computeArrearsBucket,
  computeRecoveryTier,
  computeDormancyDays,
  computeIsMatured,
  computeCreditBalance,
  type LoanClassification,
} from '@/lib/recovery-logic'

// Large loan-book imports (10k+ rows) run many sequential insert batches against
// the database, which can exceed the default serverless function timeout.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const mappingSchema = z.object({
  loanNo: z.string(),
  memberNo: z.string().optional(),
  borrowerName: z.string(),
  disbursementDate: z.string().optional(),
  repaymentStartDate: z.string().optional(),
  expectedCompletionDate: z.string().optional(),
  lastPayDate: z.string().optional(),
  loanTenor: z.string().optional(),
  approvedAmount: z.string(),
  disbursedAmount: z.string(),
  totalPaid: z.string(),
  outstandingBalance: z.string(),
  daysInArrears: z.string(),
  classification: z.string(),
  countyCode: z.string().optional(),
  branch: z.string().optional(),
})

const requestSchema = z.object({
  filename: z.string(),
  fileBase64: z.string(),
  sheetMappings: z.record(z.string(), mappingSchema), // sheetName -> mapping
  sheetProducts: z.record(z.string(), z.string()), // sheetName -> product
  controlTotals: z
    .array(
      z.object({
        product: z.string(),
        disbursed: z.string(),
        outstanding: z.string(),
      })
    )
    .optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session || (role !== 'Admin' && role !== 'Manager' && role !== 'Superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { filename, fileBase64, sheetMappings, sheetProducts, controlTotals } =
    parsed.data

  const buffer = Buffer.from(fileBase64, 'base64')
  const sheets = workbookToJson(buffer)

  const rowsByProduct: Record<string, ReturnType<typeof parseSheet>['rows']> = {}
  let totalRows = 0
  let totalDropped = 0
  const dropReport: { sheet: string; dropped: number; reasons: string[] }[] = []

  for (const [sheetName, mapping] of Object.entries(sheetMappings)) {
    const sheetData = sheets[sheetName]
    if (!sheetData) continue
    const product = sheetProducts[sheetName] ?? sheetName

    const result = parseSheet(sheetData, mapping as ColumnMapping, product)
    rowsByProduct[product] = [...(rowsByProduct[product] ?? []), ...result.rows]
    totalRows += result.rows.length
    totalDropped += result.droppedRows
    dropReport.push({
      sheet: sheetName,
      dropped: result.droppedRows,
      reasons: result.droppedReasons.slice(0, 20), // cap for payload size
    })
  }

  // Reconciliation against control totals (if provided)
  const reconciliation = controlTotals
    ? reconcileAll(rowsByProduct, controlTotals as ControlTotal[])
    : []
  const reconciliationStatus = controlTotals
    ? allReconciled(reconciliation)
      ? 'Reconciled'
      : 'Failed'
    : 'Pending'

  // Data-quality counters
  let creditBalances = 0
  let neverPaid = 0
  let matured = 0
  let missingDates = 0
  let missingClassification = 0

  const importBatch = await prisma.importBatch.create({
    data: {
      filename,
      rowCount: totalRows,
      droppedRowCount: totalDropped,
      reconciliationStatus,
      notes: JSON.stringify({ dropReport, reconciliation }),
    },
  })

  const now = new Date()
  const loanCreates = []

  for (const [productName, rows] of Object.entries(rowsByProduct)) {
    for (const row of rows) {
      const arrearsBucket = computeArrearsBucket(row.daysInArrears)
      const recoveryTier = computeRecoveryTier(
        row.daysInArrears,
        row.classification as LoanClassification
      )
      const dormancyDays = computeDormancyDays(row.lastPayDate, now)
      const isMatured = computeIsMatured(
        row.expectedCompletionDate,
        row.outstandingBalance,
        now
      )
      const { isCreditBalance, creditBalanceType } = computeCreditBalance(
        row.outstandingBalance,
        row.totalPaid,
        row.disbursedAmount
      )

      if (isCreditBalance) creditBalances++
      if (dormancyDays === null) neverPaid++
      if (isMatured) matured++
      if (!row.disbursementDate || !row.expectedCompletionDate) missingDates++
      if (!row.classification) missingClassification++

      loanCreates.push({
        importBatchId: importBatch.id,
        loanNo: row.loanNo,
        memberNo: row.memberNo,
        borrowerName: row.borrowerName,
        product: productName,
        disbursementDate: row.disbursementDate,
        repaymentStartDate: row.repaymentStartDate,
        expectedCompletionDate: row.expectedCompletionDate,
        lastPayDate: row.lastPayDate,
        loanTenor: row.loanTenor,
        approvedAmount: row.approvedAmount,
        disbursedAmount: row.disbursedAmount,
        totalPaid: row.totalPaid,
        outstandingBalance: row.outstandingBalance,
        daysInArrears: row.daysInArrears,
        classification: row.classification,
        countyCode: row.countyCode,
        branch: row.branch ?? null,
        arrearsBucket,
        recoveryTier,
        dormancyDays,
        isMatured,
        isCreditBalance,
        creditBalanceType,
      })
    }
  }

  // Use createMany in chunks. loanNo is globally unique, so any loan already in the
  // database (e.g. from a prior import, or a retry after a partial/timed-out run) is
  // skipped rather than aborting the whole batch — this keeps imports idempotent and
  // safely retryable. insertedCount reflects how many rows were actually new.
  const chunkSize = 500
  let insertedCount = 0
  for (let i = 0; i < loanCreates.length; i += chunkSize) {
    const res = await prisma.loan.createMany({
      data: loanCreates.slice(i, i + chunkSize),
      skipDuplicates: true,
    })
    insertedCount += res.count
  }
  const skippedDuplicates = loanCreates.length - insertedCount

  await prisma.auditLog.create({
    data: {
      actorId: (session.user as { id: string }).id,
      action: 'IMPORT_BATCH_CREATED',
      entity: 'ImportBatch',
      entityId: importBatch.id,
      after: JSON.stringify({
        filename,
        rowCount: totalRows,
        droppedRowCount: totalDropped,
        reconciliationStatus,
      }),
    },
  })

  return NextResponse.json({
    importBatchId: importBatch.id,
    rowCount: totalRows,
    insertedCount,
    skippedDuplicates,
    droppedRowCount: totalDropped,
    dropReport,
    reconciliation,
    reconciliationStatus,
    dataQuality: {
      totalRows,
      totalDropped,
      creditBalances,
      neverPaid,
      matured,
      missingDates,
      missingClassification,
    },
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const batches = await prisma.importBatch.findMany({
    orderBy: { uploadedAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ batches })
}
