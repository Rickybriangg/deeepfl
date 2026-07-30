import Decimal from 'decimal.js'

// ---------------------------------------------------------------------------
// Loan statement builder.
//
// The import feed only carries aggregate figures per loan (disbursed, total
// paid, outstanding) — it has no per-transaction repayment ledger. What we DO
// have on top of that is the discretely recorded activity: "Payment received"
// recovery actions (each a dated credit) and the manually-entered installment
// schedule. This builder reconciles the two into a single chronological
// statement with a running principal balance, without inventing interest or
// penalty lines the source data doesn't provide.
// ---------------------------------------------------------------------------

export type StatementEntryType =
  | 'Disbursement'
  | 'Repayment (imported)'
  | 'Payment received'

export interface StatementEntry {
  date: string | null // ISO; null when the source date is unknown
  type: StatementEntryType
  description: string
  debit: string // increases balance owed (principal out)
  credit: string // reduces balance owed (repayments)
  balance: string // running principal balance after this entry
  reference?: string // e.g. the recovery-action id, for receipts
}

export interface StatementInstallment {
  id: string
  dueDate: string
  amount: string
  status: string
  paidDate: string | null
  paidAmount: string | null
}

export interface LoanStatement {
  loanNo: string
  borrowerName: string
  memberNo: string | null
  product: string
  branch: string | null
  countyCode: number | null
  classification: string
  arrearsBucket: string | null
  recoveryTier: string | null
  daysInArrears: number
  disbursementDate: string | null
  repaymentStartDate: string | null
  expectedCompletionDate: string | null
  lastPayDate: string | null
  summary: {
    approvedAmount: string
    disbursedAmount: string
    totalPaid: string
    outstandingBalance: string
    // Principal-basis closing balance implied by the ledger (disbursed − total
    // paid). May differ from `outstandingBalance` when the book balance carries
    // interest / penalties the feed doesn't itemise — surfaced as `variance`.
    ledgerBalance: string
    variance: string
    recoveryRate: number | null
    recordedPaymentsTotal: string
    importedRepayments: string
  }
  entries: StatementEntry[]
  installments: StatementInstallment[]
  generatedAt: string
}

export interface StatementLoanInput {
  loanNo: string
  borrowerName: string
  memberNo: string | null
  product: string
  branch: string | null
  countyCode: number | null
  classification: string
  arrearsBucket: string | null
  recoveryTier: string | null
  daysInArrears: number
  disbursementDate: Date | null
  repaymentStartDate: Date | null
  expectedCompletionDate: Date | null
  lastPayDate: Date | null
  approvedAmount: string
  disbursedAmount: string
  totalPaid: string
  outstandingBalance: string
}

export interface StatementPaymentInput {
  id: string
  amountReceived: string | null
  timestamp: Date
  description?: string | null
}

export interface StatementInstallmentInput {
  id: string
  dueDate: Date
  amount: string
  status: string
  paidDate: Date | null
  paidAmount: string | null
}

function d(value: string | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  try {
    return new Decimal(value.toString().replace(/,/g, ''))
  } catch {
    return new Decimal(0)
  }
}

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null
}

/**
 * Assembles a chronological loan statement with a running principal balance.
 * Pure and deterministic except for `generatedAt`, which the caller supplies so
 * the function stays testable.
 */
export function buildLoanStatement(
  loan: StatementLoanInput,
  payments: StatementPaymentInput[],
  installments: StatementInstallmentInput[],
  generatedAt: Date
): LoanStatement {
  const disbursed = d(loan.disbursedAmount)
  const totalPaid = d(loan.totalPaid)

  // Only actual money-in actions count as ledger credits.
  const recordedPayments = payments
    .filter((p) => d(p.amountReceived).gt(0))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const recordedTotal = recordedPayments.reduce(
    (sum, p) => sum.plus(d(p.amountReceived)),
    new Decimal(0)
  )

  // Repayments captured before the system existed (imported aggregate minus
  // what we can attribute to recorded actions). Never negative.
  const importedRepayments = Decimal.max(totalPaid.minus(recordedTotal), new Decimal(0))

  const entries: StatementEntry[] = []
  let balance = new Decimal(0)

  // 1) Opening disbursement — principal goes out.
  balance = balance.plus(disbursed)
  entries.push({
    date: iso(loan.disbursementDate),
    type: 'Disbursement',
    description: `Loan disbursed — ${loan.product}`,
    debit: disbursed.toFixed(2),
    credit: '0.00',
    balance: balance.toFixed(2),
  })

  // 2) Historical/imported repayments, as one reconciling credit line.
  if (importedRepayments.gt(0)) {
    balance = balance.minus(importedRepayments)
    entries.push({
      date: iso(loan.repaymentStartDate ?? loan.disbursementDate),
      type: 'Repayment (imported)',
      description: 'Repayments recorded prior to system (imported aggregate)',
      debit: '0.00',
      credit: importedRepayments.toFixed(2),
      balance: balance.toFixed(2),
    })
  }

  // 3) Individually recorded payments, in date order.
  for (const p of recordedPayments) {
    const amount = d(p.amountReceived)
    balance = balance.minus(amount)
    entries.push({
      date: iso(p.timestamp),
      type: 'Payment received',
      description: p.description?.trim() || 'Payment received',
      debit: '0.00',
      credit: amount.toFixed(2),
      balance: balance.toFixed(2),
      reference: p.id,
    })
  }

  const ledgerBalance = balance
  const outstanding = d(loan.outstandingBalance)
  const variance = outstanding.minus(ledgerBalance)

  const statementInstallments: StatementInstallment[] = installments
    .slice()
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .map((i) => ({
      id: i.id,
      dueDate: i.dueDate.toISOString(),
      amount: d(i.amount).toFixed(2),
      status: i.status,
      paidDate: iso(i.paidDate),
      paidAmount: i.paidAmount != null ? d(i.paidAmount).toFixed(2) : null,
    }))

  return {
    loanNo: loan.loanNo,
    borrowerName: loan.borrowerName,
    memberNo: loan.memberNo,
    product: loan.product,
    branch: loan.branch,
    countyCode: loan.countyCode,
    classification: loan.classification,
    arrearsBucket: loan.arrearsBucket,
    recoveryTier: loan.recoveryTier,
    daysInArrears: loan.daysInArrears,
    disbursementDate: iso(loan.disbursementDate),
    repaymentStartDate: iso(loan.repaymentStartDate),
    expectedCompletionDate: iso(loan.expectedCompletionDate),
    lastPayDate: iso(loan.lastPayDate),
    summary: {
      approvedAmount: d(loan.approvedAmount).toFixed(2),
      disbursedAmount: disbursed.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      outstandingBalance: outstanding.toFixed(2),
      ledgerBalance: ledgerBalance.toFixed(2),
      variance: variance.toFixed(2),
      recoveryRate: disbursed.gt(0)
        ? totalPaid.div(disbursed).mul(100).toNumber()
        : null,
      recordedPaymentsTotal: recordedTotal.toFixed(2),
      importedRepayments: importedRepayments.toFixed(2),
    },
    entries,
    installments: statementInstallments,
    generatedAt: generatedAt.toISOString(),
  }
}
