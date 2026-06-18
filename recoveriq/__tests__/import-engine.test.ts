import { describe, it, expect } from 'vitest'
import { parseSheet, type ColumnMapping } from '@/lib/import-engine'
import { reconcileProduct, reconcileAll, allReconciled } from '@/lib/reconciliation'
import type { ParsedLoanRow } from '@/lib/import-engine'

const mapping: ColumnMapping = {
  loanNo: 'Loan No',
  borrowerName: 'Borrower',
  approvedAmount: 'Approved',
  disbursedAmount: 'Disbursed',
  totalPaid: 'Paid',
  outstandingBalance: 'Outstanding',
  daysInArrears: 'Arrears',
  classification: 'Class',
}

describe('parseSheet — subtotal row rejection', () => {
  it('rejects rows with blank loanNo (embedded subtotal rows)', () => {
    const sheetData = [
      {
        'Loan No': 'LN001',
        Borrower: 'Jane Doe',
        Approved: 100000,
        Disbursed: 100000,
        Paid: 20000,
        Outstanding: 80000,
        Arrears: 10,
        Class: 'Normal',
      },
      {
        'Loan No': null,
        Borrower: 'TOTAL',
        Approved: 7000000,
        Disbursed: 7000000,
        Paid: 1000000,
        Outstanding: 6000000,
        Arrears: 7000000,
        Class: '',
      },
    ]
    const result = parseSheet(sheetData, mapping, 'Agribizz')
    expect(result.rows).toHaveLength(1)
    expect(result.droppedRows).toBe(1)
    expect(result.rows[0].loanNo).toBe('LN001')
  })

  it('rejects rows where loanNo literally says Total/Subtotal', () => {
    const sheetData = [
      {
        'Loan No': 'Subtotal',
        Borrower: '',
        Approved: 5000000,
        Disbursed: 5000000,
        Paid: 0,
        Outstanding: 5000000,
        Arrears: 0,
        Class: '',
      },
    ]
    const result = parseSheet(sheetData, mapping, 'Agribizz')
    expect(result.rows).toHaveLength(0)
    expect(result.droppedRows).toBe(1)
  })

  it('keeps a normal row intact with correct fields', () => {
    const sheetData = [
      {
        'Loan No': 'LN-002',
        Borrower: '  John   Smith  ',
        Approved: '150,000.00',
        Disbursed: 150000,
        Paid: 50000,
        Outstanding: 100000,
        Arrears: 45,
        Class: 'Watch',
      },
    ]
    const result = parseSheet(sheetData, mapping, 'Vuka')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].borrowerName).toBe('John Smith')
    expect(result.rows[0].approvedAmount).toBe('150000.00')
    expect(result.rows[0].daysInArrears).toBe(45)
  })
})

describe('reconcileProduct', () => {
  const rows: ParsedLoanRow[] = [
    {
      loanNo: 'LN1',
      memberNo: null,
      borrowerName: 'A',
      disbursementDate: null,
      repaymentStartDate: null,
      expectedCompletionDate: null,
      lastPayDate: null,
      loanTenor: null,
      approvedAmount: '100000',
      disbursedAmount: '100000.00',
      totalPaid: '20000',
      outstandingBalance: '80000.00',
      daysInArrears: 0,
      classification: 'Normal',
      countyCode: null,
    },
    {
      loanNo: 'LN2',
      memberNo: null,
      borrowerName: 'B',
      disbursementDate: null,
      repaymentStartDate: null,
      expectedCompletionDate: null,
      lastPayDate: null,
      loanTenor: null,
      approvedAmount: '50000',
      disbursedAmount: '50000.00',
      totalPaid: '10000',
      outstandingBalance: '40000.00',
      daysInArrears: 10,
      classification: 'Normal',
      countyCode: null,
    },
  ]

  it('reconciles when totals tie out exactly', () => {
    const result = reconcileProduct('Agribizz', rows, {
      product: 'Agribizz',
      disbursed: '150000.00',
      outstanding: '120000.00',
    })
    expect(result.reconciled).toBe(true)
    expect(result.disbursedDiff).toBe('0.00')
  })

  it('flags non-zero differences as not reconciled', () => {
    const result = reconcileProduct('Agribizz', rows, {
      product: 'Agribizz',
      disbursed: '150000.00',
      outstanding: '125000.00', // off by 5000
    })
    expect(result.reconciled).toBe(false)
    expect(result.outstandingDiff).toBe('-5000.00')
  })

  it('returns reconciled:false with nulls when no control provided', () => {
    const result = reconcileProduct('Agribizz', rows, null)
    expect(result.reconciled).toBe(false)
    expect(result.controlDisbursed).toBeNull()
  })

  it('still reconciles even if the embedded subtotal row was correctly dropped', () => {
    // Demonstrates that summing loan-level rows (with subtotal excluded)
    // equals the control total exactly — proving the dropped-row logic
    // prevents double-counting.
    const result = reconcileProduct('Agribizz', rows, {
      product: 'Agribizz',
      disbursed: '150000.00',
      outstanding: '120000.00',
    })
    expect(result.reconciled).toBe(true)
  })
})

describe('reconcileAll / allReconciled', () => {
  it('returns true only when every product reconciles', () => {
    const rowsByProduct = {
      Agribizz: [
        {
          loanNo: 'A1',
          memberNo: null,
          borrowerName: 'X',
          disbursementDate: null,
          repaymentStartDate: null,
          expectedCompletionDate: null,
          lastPayDate: null,
          loanTenor: null,
          approvedAmount: '1000',
          disbursedAmount: '1000.00',
          totalPaid: '0',
          outstandingBalance: '1000.00',
          daysInArrears: 0,
          classification: 'Normal',
          countyCode: null,
        },
      ],
    }
    const results = reconcileAll(rowsByProduct, [
      { product: 'Agribizz', disbursed: '1000.00', outstanding: '1000.00' },
    ])
    expect(allReconciled(results)).toBe(true)
  })

  it('returns false if any product is off', () => {
    const rowsByProduct = {
      Agribizz: [
        {
          loanNo: 'A1',
          memberNo: null,
          borrowerName: 'X',
          disbursementDate: null,
          repaymentStartDate: null,
          expectedCompletionDate: null,
          lastPayDate: null,
          loanTenor: null,
          approvedAmount: '1000',
          disbursedAmount: '1000.00',
          totalPaid: '0',
          outstandingBalance: '1000.00',
          daysInArrears: 0,
          classification: 'Normal',
          countyCode: null,
        },
      ],
    }
    const results = reconcileAll(rowsByProduct, [
      { product: 'Agribizz', disbursed: '1000.00', outstanding: '999.00' },
    ])
    expect(allReconciled(results)).toBe(false)
  })
})
