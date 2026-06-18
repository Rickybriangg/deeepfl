export type EscalationStage =
  | 'Reminder'
  | 'Demand letter'
  | 'Guarantor contact'
  | 'CRB listing'
  | 'Legal'
  | 'Write-off review'

export function suggestEscalation(daysInArrears: number): EscalationStage {
  if (daysInArrears <= 30) return 'Reminder'
  if (daysInArrears <= 90) return 'Demand letter'
  if (daysInArrears <= 180) return 'Guarantor contact'
  if (daysInArrears <= 360) return 'CRB listing'
  if (daysInArrears <= 720) return 'Legal'
  return 'Write-off review'
}

export function generateDemandLetter(loan: {
  borrowerName: string
  loanNo: string
  outstandingBalance: string
  daysInArrears: number
}): string {
  const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
  return `
YOUTH ENTERPRISE DEVELOPMENT FUND
Credit Unit — Demand Notice

Date: ${today}

To: ${loan.borrowerName}
Loan Account: ${loan.loanNo}

Dear ${loan.borrowerName},

This letter serves as formal notice that your loan account ${loan.loanNo} has an
outstanding balance of KES ${loan.outstandingBalance} and is currently ${loan.daysInArrears}
days in arrears.

You are required to settle this outstanding balance, or contact our Credit Unit to
arrange a repayment plan, within 14 days of the date of this letter. Failure to respond
may result in further recovery action including referral to a Credit Reference Bureau
and/or legal proceedings.

Please contact your assigned recovery officer or visit your nearest YEDF office.

Yours faithfully,
YEDF Credit Unit
`.trim()
}

export function generateSmsText(loan: {
  borrowerName: string
  loanNo: string
  outstandingBalance: string
}): string {
  return `YEDF: Dear ${loan.borrowerName}, your loan ${loan.loanNo} has an outstanding balance of KES ${loan.outstandingBalance}. Please pay or contact your recovery officer to avoid further action.`
}
