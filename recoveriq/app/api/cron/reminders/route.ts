import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatKES } from '@/lib/format'
import {
  stageForDaysFromDue,
  renderTemplate,
  CHANNEL_INTEGRATION,
  type ReminderChannel,
} from '@/lib/reminder-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Invoked daily by the Vercel cron in vercel.json. For each active loan whose
// due date lands on a scheduled reminder day, renders every enabled template
// for that stage and records a ReminderLog. Internal (CRM) reminders are
// "sent" immediately; external channels are "queued" when their integration
// is configured, otherwise "skipped" — so the engine runs today and starts
// delivering externally the moment credentials are entered in Settings.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const templates = await prisma.reminderTemplate.findMany({ where: { enabled: true } })
  if (templates.length === 0) return NextResponse.json({ checked: 0, generated: 0, note: 'No enabled templates' })

  // Which external channels are configured (have saved credentials).
  const integrations = await prisma.integrationSetting.findMany()
  const configured = new Set(integrations.filter((i) => i.config).map((i) => i.key))

  const loans = await prisma.loan.findMany({ where: { outstandingBalance: { not: '0' } } })

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const MS_PER_DAY = 1000 * 60 * 60 * 24

  let generated = 0
  let checked = 0

  for (const loan of loans) {
    // Best-effort days-from-due: overdue loans use daysInArrears; otherwise
    // derive from expectedCompletionDate (negative = days remaining).
    let daysFromDue: number | null = null
    if (loan.daysInArrears > 0) {
      daysFromDue = loan.daysInArrears
    } else if (loan.expectedCompletionDate) {
      const due = new Date(
        loan.expectedCompletionDate.getFullYear(),
        loan.expectedCompletionDate.getMonth(),
        loan.expectedCompletionDate.getDate()
      )
      daysFromDue = Math.round((todayStart.getTime() - due.getTime()) / MS_PER_DAY)
    }
    if (daysFromDue === null) continue

    const stage = stageForDaysFromDue(daysFromDue)
    if (!stage) continue
    checked++

    const stageTemplates = templates.filter((t) => t.stage === stage)
    for (const tpl of stageTemplates) {
      // De-dupe: one reminder per (loan, channel, stage) per day.
      const existing = await prisma.reminderLog.findFirst({
        where: { loanNo: loan.loanNo, channel: tpl.channel, stage, createdAt: { gte: todayStart } },
      })
      if (existing) continue

      const message = renderTemplate(tpl.body, {
        name: loan.borrowerName,
        amount: formatKES(loan.outstandingBalance),
        loanNo: loan.loanNo,
        daysInArrears: loan.daysInArrears,
      })

      const integrationKey = CHANNEL_INTEGRATION[tpl.channel as ReminderChannel]
      let status: string
      if (integrationKey === null) {
        status = 'sent' // internal CRM notification — always available
      } else if (configured.has(integrationKey)) {
        status = 'queued' // provider configured; awaiting outbound send
      } else {
        status = 'skipped' // no credentials for this channel yet
      }

      await prisma.reminderLog.create({
        data: { loanNo: loan.loanNo, channel: tpl.channel, stage, status, message },
      })
      generated++
    }
  }

  return NextResponse.json({ checked, generated })
}
