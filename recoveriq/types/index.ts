// Domain enums

export const LOAN_PRODUCTS = [
  'Agribizz',
  'Asset Finance',
  'Vuka',
  'Go Green',
  'LPO/LSO',
  'Migration',
  'Talanta',
  'VIBE',
  'Group Loan',
] as const
export type LoanProduct = (typeof LOAN_PRODUCTS)[number]

export const LOAN_CLASSIFICATIONS = [
  'Normal',
  'Watch',
  'Substandard',
  'Doubtful',
  'Loss',
] as const
export type LoanClassification = (typeof LOAN_CLASSIFICATIONS)[number]

export const RECOVERY_TIERS = [
  'Curable',
  'At-risk',
  'Doubtful',
  'Impaired',
] as const
export type RecoveryTier = (typeof RECOVERY_TIERS)[number]

export const ARREARS_BUCKETS = [
  'Current',
  '1-30',
  '31-90',
  '91-180',
  '181-360',
  '360+',
] as const
export type ArrearsBucket = (typeof ARREARS_BUCKETS)[number]

export const CASE_STATUSES = [
  'New',
  'In progress',
  'Promised to pay',
  'Restructured',
  'Legal',
  'CRB-listed',
  'Written-off',
  'Recovered',
  'Closed',
] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const ACTION_TYPES = [
  'Call',
  'SMS',
  'Demand letter',
  'Field visit',
  'Restructure offer',
  'Guarantor contact',
  'CRB listing',
  'Legal',
  'Payment received',
  'Note',
] as const
export type ActionType = (typeof ACTION_TYPES)[number]

export const USER_ROLES = ['Admin', 'Manager', 'Officer', 'Viewer'] as const
export type UserRole = (typeof USER_ROLES)[number]

// DTO shapes used across API routes and components

export interface LoanRow {
  id: string
  loanNo: string
  memberNo: string | null
  borrowerName: string
  product: string
  disbursementDate: string | null
  repaymentStartDate: string | null
  expectedCompletionDate: string | null
  lastPayDate: string | null
  loanTenor: number | null
  approvedAmount: string
  disbursedAmount: string
  totalPaid: string
  outstandingBalance: string
  daysInArrears: number
  classification: string
  countyCode: number | null
  arrearsBucket: string | null
  recoveryTier: string | null
  dormancyDays: number | null
  isMatured: boolean
  isCreditBalance: boolean
  creditBalanceType: string | null
  importBatchId: string
}

export interface DashboardKPIs {
  totalOutstanding: string
  recoveryRate: number | null
  nplRatio: number | null
  par30: number | null
  totalAccounts: number
  activeCases: number
  tierBreakdown: Record<string, { count: number; outstanding: string }>
  classificationBreakdown: Record<string, { count: number; outstanding: string }>
  productBreakdown: Array<{
    product: string
    outstanding: string
    recoveryRate: number | null
  }>
}

export interface ReconciliationRow {
  product: string
  subledgerDisbursed: string
  subledgerOutstanding: string
  controlDisbursed: string | null
  controlOutstanding: string | null
  disbursedDiff: string | null
  outstandingDiff: string | null
  reconciled: boolean
}
