import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { jsPDF } from 'jspdf'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatKES } from '@/lib/format'

export const dynamic = 'force-dynamic'

// Generates a PDF receipt for a recorded "Payment received" action
// (roadmap 1.11 "Generate receipts"). No payment gateway required.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const action = await prisma.recoveryAction.findUnique({
    where: { id },
    include: { officer: true, case: { include: { loan: true } } },
  })

  if (!action || action.type !== 'Payment received') {
    return NextResponse.json({ error: 'Payment action not found' }, { status: 404 })
  }

  const loan = action.case.loan
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('RecoverIQ — Payment Receipt', 14, 20)
  doc.setFontSize(10)
  doc.text('Youth Enterprise Development Fund — Credit Unit', 14, 27)
  doc.setDrawColor(200)
  doc.line(14, 32, 196, 32)

  const rows: Array<[string, string]> = [
    ['Receipt No', action.id],
    ['Date', action.timestamp.toLocaleString()],
    ['Loan No', loan.loanNo],
    ['Borrower', loan.borrowerName],
    ['Product', loan.product],
    ['Amount received', formatKES(action.amountReceived)],
    ['Outstanding balance (after)', formatKES(loan.outstandingBalance)],
    ['Received by', action.officer.name],
  ]

  let y = 44
  doc.setFontSize(11)
  for (const [label, value] of rows) {
    doc.setTextColor(120)
    doc.text(label, 14, y)
    doc.setTextColor(0)
    doc.text(String(value), 80, y)
    y += 9
  }

  doc.setDrawColor(200)
  doc.line(14, y, 196, y)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('This is a system-generated receipt and does not require a signature.', 14, y + 8)

  const buf = Buffer.from(doc.output('arraybuffer'))
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt_${loan.loanNo}_${action.id}.pdf"`,
    },
  })
}
