import * as XLSX from 'xlsx'
import Decimal from 'decimal.js'

// ---------------------------------------------------------------------------
// Fiscal-year vintage parser.
//
// Reads the "SUMMARY" sheet of the disbursement/repayment report — one row per
// financial year with Approved / Outstanding / Due / Recovered / loans-issued —
// into structured vintage records. The recovery rate is recomputed from
// recovered ÷ due (as a percent) rather than trusting the sheet's fraction.
// ---------------------------------------------------------------------------

export interface VintageRow {
  fiscalYear: string
  sortKey: number
  approvedAmount: string
  outstandingBalance: string
  amountDue: string
  amountRecovered: string
  recoveryRate: number | null // percent
  loansIssued: number
  isAggregate: boolean
}

function money(v: unknown): string {
  if (v === null || v === undefined || v === '') return '0'
  try {
    const cleaned = String(v).replace(/,/g, '').trim()
    if (cleaned === '') return '0'
    return new Decimal(cleaned).toFixed(2)
  } catch {
    return '0'
  }
}

function toInt(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

// "FY 2013/2014" -> 2013 ; "FY 2019/20 - FY 2025/26" -> 2019
function startYear(label: string): number {
  const m = label.match(/(\d{4})/)
  return m ? parseInt(m[1], 10) : 0
}

// A data row's first cell looks like a fiscal-year label ("FY 2013/2014").
function isFyLabel(v: unknown): v is string {
  return typeof v === 'string' && /FY\s*\d{4}/i.test(v)
}

/**
 * Parses the SUMMARY sheet of the FY disbursement/repayment workbook.
 * Rows spanning multiple years (e.g. "FY 2019/20 - FY 2025/26") are kept and
 * flagged `isAggregate`. The grand-total row (blank first cell) is skipped.
 */
export function parseVintageSummary(buffer: ArrayBuffer | Buffer): VintageRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName =
    wb.SheetNames.find((n) => /summary/i.test(n)) ?? wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
  })

  const rows: VintageRow[] = []
  for (const raw of aoa) {
    const label = raw?.[0]
    if (!isFyLabel(label)) continue // skips titles, header, and grand total

    const fiscalYear = label.trim()
    const approvedAmount = money(raw[1])
    const loansIssued = toInt(raw[6])
    // Skip data-less rows such as the report's period subtitle
    // ("FY 2006/2007 - FY 2025/2026"), which carries a label but no figures.
    if (new Decimal(approvedAmount).lte(0) && loansIssued === 0) continue

    const amountDue = money(raw[3])
    const amountRecovered = money(raw[4])
    const due = new Decimal(amountDue)
    const recoveryRate = due.gt(0)
      ? new Decimal(amountRecovered).div(due).mul(100).toNumber()
      : null

    rows.push({
      fiscalYear,
      sortKey: startYear(fiscalYear),
      approvedAmount,
      outstandingBalance: money(raw[2]),
      amountDue,
      amountRecovered,
      recoveryRate,
      loansIssued,
      isAggregate: /-/.test(fiscalYear),
    })
  }

  rows.sort((a, b) => a.sortKey - b.sortKey)
  return rows
}
