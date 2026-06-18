import Decimal from 'decimal.js'
import type { ParsedLoanRow } from './import-engine'

export interface ControlTotal {
  product: string
  disbursed: string
  outstanding: string
}

export interface ProductReconciliation {
  product: string
  subledgerDisbursed: string
  subledgerOutstanding: string
  controlDisbursed: string | null
  controlOutstanding: string | null
  disbursedDiff: string | null
  outstandingDiff: string | null
  reconciled: boolean
}

const TOLERANCE = new Decimal('0.01') // tie out to the shilling cent

export function sumProductTotals(
  rows: ParsedLoanRow[]
): { disbursed: Decimal; outstanding: Decimal } {
  let disbursed = new Decimal(0)
  let outstanding = new Decimal(0)
  for (const row of rows) {
    disbursed = disbursed.plus(new Decimal(row.disbursedAmount))
    outstanding = outstanding.plus(new Decimal(row.outstandingBalance))
  }
  return { disbursed, outstanding }
}

export function reconcileProduct(
  product: string,
  rows: ParsedLoanRow[],
  control: ControlTotal | null
): ProductReconciliation {
  const { disbursed, outstanding } = sumProductTotals(rows)

  if (!control) {
    return {
      product,
      subledgerDisbursed: disbursed.toFixed(2),
      subledgerOutstanding: outstanding.toFixed(2),
      controlDisbursed: null,
      controlOutstanding: null,
      disbursedDiff: null,
      outstandingDiff: null,
      reconciled: false,
    }
  }

  const controlDisbursed = new Decimal(control.disbursed)
  const controlOutstanding = new Decimal(control.outstanding)
  const disbursedDiff = disbursed.minus(controlDisbursed)
  const outstandingDiff = outstanding.minus(controlOutstanding)

  const reconciled =
    disbursedDiff.abs().lte(TOLERANCE) && outstandingDiff.abs().lte(TOLERANCE)

  return {
    product,
    subledgerDisbursed: disbursed.toFixed(2),
    subledgerOutstanding: outstanding.toFixed(2),
    controlDisbursed: controlDisbursed.toFixed(2),
    controlOutstanding: controlOutstanding.toFixed(2),
    disbursedDiff: disbursedDiff.toFixed(2),
    outstandingDiff: outstandingDiff.toFixed(2),
    reconciled,
  }
}

export function reconcileAll(
  rowsByProduct: Record<string, ParsedLoanRow[]>,
  controls: ControlTotal[]
): ProductReconciliation[] {
  const controlsByProduct = new Map(controls.map((c) => [c.product, c]))
  return Object.entries(rowsByProduct).map(([product, rows]) =>
    reconcileProduct(product, rows, controlsByProduct.get(product) ?? null)
  )
}

export function allReconciled(results: ProductReconciliation[]): boolean {
  return results.every((r) => r.reconciled)
}
