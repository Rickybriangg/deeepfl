import * as XLSX from 'xlsx'
import Decimal from 'decimal.js'
import { isValidLoanNo, trimName } from './recovery-logic'
import { LOAN_PRODUCTS } from '@/types'

export interface ColumnMapping {
  loanNo: string
  memberNo?: string
  borrowerName: string
  disbursementDate?: string
  repaymentStartDate?: string
  expectedCompletionDate?: string
  lastPayDate?: string
  loanTenor?: string
  approvedAmount: string
  disbursedAmount: string
  totalPaid: string
  outstandingBalance: string
  daysInArrears: string
  classification: string
  countyCode?: string
  branch?: string
}

export interface ParsedLoanRow {
  loanNo: string
  memberNo: string | null
  borrowerName: string
  disbursementDate: Date | null
  repaymentStartDate: Date | null
  expectedCompletionDate: Date | null
  lastPayDate: Date | null
  loanTenor: number | null
  approvedAmount: string
  disbursedAmount: string
  totalPaid: string
  outstandingBalance: string
  daysInArrears: number
  classification: string
  countyCode: number | null
  branch?: string | null
}

export interface SheetParseResult {
  product: string
  rows: ParsedLoanRow[]
  droppedRows: number
  droppedReasons: string[]
  totalRowsInSheet: number
}

export interface DataQualitySummary {
  totalRows: number
  totalDropped: number
  creditBalances: number
  neverPaid: number
  matured: number
  missingDates: number
  missingClassification: number
}

// Excel serial date -> JS Date (handles both date objects and serial numbers)
function parseExcelDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    return new Date(parsed.y, parsed.m - 1, parsed.d)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = new Date(trimmed)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function parseMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '0'
  try {
    const cleaned = String(value).replace(/,/g, '').replace(/^\(([\d.]+)\)$/, '-$1').trim()
    if (cleaned === '') return '0'
    return new Decimal(cleaned).toFixed(2)
  } catch {
    return '0'
  }
}

function parseInt0(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.trunc(n)
}

function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(String(value).replace(/,/g, ''))
  return isNaN(n) ? null : Math.trunc(n)
}

/**
 * Parses a single product sheet using a column mapping.
 * Rows with no valid loanNo (blank, "Total", "Subtotal", non-numeric junk) are
 * dropped and counted — these are the embedded SUBTOTAL rows that, if ingested,
 * would double-count the product total.
 */
export function parseSheet(
  sheetData: Record<string, unknown>[],
  mapping: ColumnMapping,
  product: string
): SheetParseResult {
  const rows: ParsedLoanRow[] = []
  const droppedReasons: string[] = []
  let droppedRows = 0

  for (const raw of sheetData) {
    const loanNoRaw = raw[mapping.loanNo]

    if (!isValidLoanNo(loanNoRaw)) {
      droppedRows++
      droppedReasons.push(
        `Row dropped: invalid/missing loanNo ("${loanNoRaw ?? ''}")`
      )
      continue
    }

    rows.push({
      loanNo: trimName(loanNoRaw),
      memberNo: mapping.memberNo ? trimName(raw[mapping.memberNo]) || null : null,
      borrowerName: trimName(raw[mapping.borrowerName]),
      disbursementDate: mapping.disbursementDate
        ? parseExcelDate(raw[mapping.disbursementDate])
        : null,
      repaymentStartDate: mapping.repaymentStartDate
        ? parseExcelDate(raw[mapping.repaymentStartDate])
        : null,
      expectedCompletionDate: mapping.expectedCompletionDate
        ? parseExcelDate(raw[mapping.expectedCompletionDate])
        : null,
      lastPayDate: mapping.lastPayDate
        ? parseExcelDate(raw[mapping.lastPayDate])
        : null,
      loanTenor: mapping.loanTenor ? parseIntOrNull(raw[mapping.loanTenor]) : null,
      approvedAmount: parseMoney(raw[mapping.approvedAmount]),
      disbursedAmount: parseMoney(raw[mapping.disbursedAmount]),
      totalPaid: parseMoney(raw[mapping.totalPaid]),
      outstandingBalance: parseMoney(raw[mapping.outstandingBalance]),
      daysInArrears: parseInt0(raw[mapping.daysInArrears]),
      classification: trimName(raw[mapping.classification]) || 'Normal',
      countyCode: mapping.countyCode ? parseIntOrNull(raw[mapping.countyCode]) : null,
      branch: mapping.branch ? trimName(raw[mapping.branch]) || null : null,
    })
  }

  return {
    product,
    rows,
    droppedRows,
    droppedReasons,
    totalRowsInSheet: sheetData.length,
  }
}

export function workbookToJson(buffer: ArrayBuffer | Buffer): Record<string, Record<string, unknown>[]> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const result: Record<string, Record<string, unknown>[]> = {}
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    result[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: null })
  }
  return result
}

export function getSheetHeaders(
  sheetData: Record<string, unknown>[]
): string[] {
  if (sheetData.length === 0) return []
  return Object.keys(sheetData[0])
}

export const KNOWN_PRODUCTS = LOAN_PRODUCTS
