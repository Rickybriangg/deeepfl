# RecoverIQ — Product Roadmap & Feature Specification (DRAFT)

> Status: **Draft — actively being developed.**
> This document is the single source of truth for the Loan Management & Recovery
> feature set. Each item is a checklist entry. We complete and tick off one
> feature at a time, commit it, then move to the next.
>
> Legend: `[ ]` not started · `[~]` in progress · `[x]` done
> Items marked 🔑 require **user-supplied credentials / API keys** — these live in
> the **Settings → Integrations** area and are **restricted to Superadmin only**
> (see [Settings & Credentials](#settings--credentials-superadmin-only)).

---

## 1. Loan Management Features

### 1.1 Loan Portfolio Dashboard
Interactive dashboard displaying:
- [x] Total Active Loans *(`Total Accounts` KPI)*
- [x] Total Outstanding Balance
- [x] Total Overdue Amount
- [x] Portfolio at Risk (PAR) *(`PAR > 30` KPI)*
- [x] Loans Due Today
- [x] Loans Due This Week
- [x] Loans Due This Month
- [ ] Collection Performance *(needs dated payment-transaction history to compute period-over-period collections; only cumulative `totalPaid` exists today)*
- [x] Recovery Rate *(`Recovery Rate` KPI, already shipped)*
- [x] Default Rate
- [x] Loan Aging Analysis *(Portfolio page "Arrears Aging" chart)*
- [x] Collector Performance Ranking *(Portfolio page table)*
- [x] Branch Performance *(Loan.branch field + Portfolio chart; needs `branch` column mapped on import)*
- [x] Recovery Trends *(`PortfolioSnapshot` model + daily Vercel cron + Portfolio line chart)*

### 1.2 Automated Due Monitoring
System must automatically:
- [~] **Due Date Tracking** — monitor loan due dates continuously *(uses expectedCompletionDate; per-installment schedule pending)*
- [ ] Track upcoming installments *(needs installment schedule model)*
- [x] Detect overdue payments instantly *(via daysInArrears)*
- [x] Classify delinquency stages automatically *(`computeDelinquencyStage`)*

Delinquency categories *(computed in `lib/recovery-logic.ts`, surfaced on Dashboard)*:
- [x] Current
- [~] Due Today *(best-effort via due date; full support needs installment schedule)*
- [x] 1–7 Days Overdue
- [x] 8–30 Days Overdue
- [x] 31–60 Days Overdue
- [x] 61–90 Days Overdue
- [x] 91–180 Days Overdue
- [x] Defaulted

### 1.3 Automated Reminder Engine
Send reminders through communication channels:
- [~] 🔑 WhatsApp (WhatsApp Business API) *(engine queues these; outbound send wired once the `whatsapp` integration credentials are saved)*
- [~] 🔑 SMS (SMS Gateway) *(queued; needs `sms` credentials to deliver)*
- [~] 🔑 Email (SMTP) *(queued; needs `smtp` credentials to deliver)*
- [~] 🔑 Mobile Push Notifications *(queued; needs `push` credentials to deliver)*
- [~] 🔑 Voice Calls (optional) *(queued; needs `voice` credentials to deliver)*
- [x] CRM Internal Notifications *(internal channel — delivered immediately as `ReminderLog` entries, no credentials required)*

Reminder schedule (all templates configurable):
- [x] Before due date: 14 days / 7 days / 3 days / 1 day before *(`REMINDER_STAGES` before-14/7/3/1)*
- [x] Due date: morning reminder *(`due-am`; an afternoon slot can be added as another stage if needed)*
- [x] After due date: Day 1 / Day 3 / Day 7 / Day 14 / Day 30 overdue *(`after-1/3/7/14/30`)*
- [x] Configurable message templates per channel & stage *(`ReminderTemplate` model, edited on the new `/reminders` page; `{{name}}/{{amount}}/{{loanNo}}/{{daysInArrears}}` placeholders)*

Implemented as `lib/reminder-engine.ts` (schedule + template logic, unit-tested),
a daily `/api/cron/reminders` job that matches each loan's due date to a
schedule stage and records a `ReminderLog`, and the `/reminders` admin page
(template editor + activity log). Internal reminders deliver today; external
channels flip from `skipped` → `queued` automatically once their credentials
exist in Settings → Integrations.

### 1.4 Collection Workflow Automation
Automatic workflows, each stage triggered by predefined rules:
- [x] Level 1 — Friendly reminder *(`notify`: logs a Note action + AuditLog entry)*
- [x] Level 2 — Urgent notification *(`notify`)*
- [x] Level 3 — Recovery officer assignment *(`assign_officer`: round-robin to the Officer with fewest open cases)*
- [x] Level 4 — Supervisor escalation *(`escalate_supervisor`: sets `priorityTier`)*
- [x] Level 5 — Legal recovery escalation *(`escalate_legal`: sets `status = 'Legal'`)*

Implemented as `/api/cron/workflow-automation` (daily Vercel cron), driven by
the `AutomationRule` table (see 1.13). Each overdue loan's `RecoveryCase`
is advanced through `workflowLevel` 1–5 as it crosses each rule's
days-in-arrears threshold; every transition logs a `RecoveryAction` and an
`AuditLog` entry.

### 1.5 Recovery Officer Management
- [~] Recovery Officer Dashboard *(Cases page "My queue" view serves this; no dedicated officer-only dashboard yet)*
- [x] Assigned Accounts List *(Cases page "My queue" view)*
- [ ] Visit Scheduling
- [x] Call Logs *("Call" action type in case action log)*
- [x] Follow-up Notes *(`notes` field on RecoveryAction)*
- [x] Promise-to-Pay Tracking *(see 1.6)*
- [x] Collector Performance Metrics *(Portfolio page ranking table)*
- [x] Visit Scheduling *(logging a "Field visit" action lets the officer set a scheduled date, stored on `RecoveryCase.nextActionDate` and shown in the "Next Action" column — reuses the same commitment-date field as PTP)*
- [x] Recovery Targets *(`RecoveryTarget` model: per-officer monthly target, set by Admin/Manager/Superadmin on the new `/targets` page; actual collections derived live from `RecoveryAction.amountReceived`, with % achieved)*

### 1.6 Promise-to-Pay (PTP) Management
Allow collectors to:
- [x] Record PTP commitments *(`amountPromised` on RecoveryAction, set when logging "Promised to pay")*
- [x] Set commitment dates *(`nextActionDate` on RecoveryCase)*
- [x] Monitor compliance *(`isBrokenPromise` flag: commitment date passed, no "Payment received" action since)*
- [x] Trigger alerts when broken *(Cases page "Broken promises" view + red badge)*
- [x] Escalate failed commitments automatically *(`/api/cron/escalate-ptp` daily Vercel cron sets `priorityTier = "PTP Broken"`, logs a Note action + AuditLog entry)*

### 1.7 Customer Risk Scoring
AI-powered risk scoring using: repayment history, loan utilization, missed
payments, customer income, credit score, previous defaults.
- [x] Scoring model / engine *(`computeRiskScore` in `lib/recovery-logic.ts` — rules-based 0–100 score from days in arrears, classification, principal-repaid ratio, dormancy, and broken promises; surfaced on the new `/risk` page + `/api/risk`)*
- [x] Risk bands: Low / Medium / High / Critical *(`bandForScore`: <25 / 25–49 / 50–74 / 75+)*
- [ ] 🔑 External credit score provider (if used) *(scaffolded in Settings → Integrations as "Credit score provider"; the in-house engine runs today with no external call — swap in the bureau score once credentials are entered)*

### 1.8 AI Predictive Recovery Engine
Predictive analytics to:
- [x] Predict likelihood of default *(risk score / band serves as the default-likelihood proxy)*
- [x] Predict payment probability *(`predictRecovery` — inverse of risk score, floored/capped 5–95%)*
- [x] Recommend best collection strategy *(`predictRecovery.recommendedStrategy`, per risk band)*
- [x] Prioritize accounts by recovery potential *(`priority` = risk × outstanding-balance weight; `/risk` page sorts by it)*
- [x] Forecast monthly collections *(`/api/risk` now sums each loan's outstanding balance weighted by payment probability into a portfolio-level `forecastMonthlyCollections` figure, shown as a KPI card on `/risk`)*
- [ ] 🔑 AI service provider / model API (if external) *(scaffolded in Settings → Integrations as "AI / Predictive service"; the heuristic engine runs today with no external call — swap in a trained model once credentials are entered)*

**Note:** 1.7/1.8 are implemented as a deliberately transparent rules-based /
heuristic engine (no black-box external model), so every score comes with its
contributing `factors`. This is production-usable now and is the drop-in
point for a real ML model later.

### 1.9 Field Recovery Module
Recovery agents (mobile app) should have:
- [x] Mobile Application *(installable PWA — `app/manifest.ts`, standalone display, home-screen icon; the responsive UI already works on phones)*
- [ ] 🔑 GPS Tracking (maps provider) *(maps credentials scaffolded in Settings → Integrations; browser geolocation can feed it without a maps key, but live map display needs the provider)*
- [ ] 🔑 Route Optimization (maps/routing API) *(needs the maps/routing provider)*
- [x] Visit Scheduling *(see 1.5 — Field visit action with a scheduled date)*
- [ ] Customer Check-in *(needs file/photo storage infra — see below)*
- [ ] Photo Capture *(needs blob storage; none provisioned yet)*
- [ ] Document Upload *(needs blob storage)*
- [ ] Digital Signature Capture *(needs blob storage)*
- [~] Offline Mode *(network-first service worker with an offline fallback page — `public/sw.js`; full offline data entry/sync needs a local store + sync engine, not yet built)*

> The remaining items (check-in photos, document/signature upload) all depend
> on a blob-storage provider (e.g. S3 / Vercel Blob) that hasn't been
> provisioned. GPS/routing depend on a maps API key. Visit Scheduling and the
> installable mobile app + basic offline shell are done.

### 1.10 Legal Recovery Management
- [x] Demand Letters *(`LegalCase.type = 'Demand Letter'`)*
- [x] Legal Notices *(`type = 'Legal Notice'`)*
- [x] Court Cases *(`type = 'Court Case'`, with `courtName`/`hearingDate`)*
- [x] Asset Repossession *(`type = 'Asset Repossession'`)*
- [x] Recovery Documentation *(`notes` + `documentRef` fields; `documentRef` is a URL/filing-number reference since there is no file-storage infra yet)*
- [x] Lawyer Assignments *(`lawyerName` field)*
- [x] Status & timeline tracking *(`status`: Draft → Sent/Filed → In court → Resolved/Closed, plus `filingDate`/`hearingDate`/`resolutionDate`)*

Implemented as a new `LegalCase` model linked to `RecoveryCase`, a
`/legal` page (Admin/Manager/Superadmin), and `/api/legal` + `/api/legal/[id]`
routes. Creating a legal action automatically sets the case's `status` to
`'Legal'`.

### 1.11 Payment Integration
Integrate with:
- [ ] 🔑 M-Pesa
- [ ] 🔑 Airtel Money
- [ ] 🔑 Banks
- [ ] 🔑 Card Payments
- [ ] 🔑 Online Payment Gateway

Automatically:
- [x] Reconcile payments *(logging a "Payment received" action reconciles against the loan: decrements outstanding, increments total paid, audit-logged as `PAYMENT_RECONCILED`)*
- [x] Update balances *(same — `outstandingBalance`/`totalPaid` updated atomically with the payment)*
- [~] Close installments *(no per-installment schedule model yet; when a balance clears the case auto-moves to `Recovered`)*
- [x] Generate receipts *(`/api/payments/[id]/receipt` — PDF receipt per payment, downloadable from the case action history)*

> The four items above are credential-free and work today for payments
> captured manually or via import. The 🔑 provider integrations above feed
> the same reconciliation path automatically once their credentials are saved.

### 1.12 Reports & Analytics
Generate:
- [x] Recovery Reports *(Full Loan Book Export)*
- [x] Daily Collection Report
- [x] Collector Performance Report
- [x] Overdue Analysis
- [x] Aging Report
- [x] Default Report
- [x] Portfolio Risk Report
- [x] Recovery Trend Analysis
- [x] Branch Comparison Report

Export formats:
- [x] PDF *(jsPDF + autotable, generic across all report types)*
- [x] Excel
- [x] CSV

### 1.13 Automation Rules Engine
Administrators configure (without modifying code):
- [x] Escalation timelines *(`AutomationRule.minDaysInArrears`/`maxDaysInArrears` per level, editable on the new Admin-only **Automation** page)*
- [x] Legal trigger points *(Level 5 `escalate_legal` threshold, editable)*
- [~] Collector assignment logic *(assignment trigger threshold is configurable; the round-robin strategy itself is fixed, not yet pluggable)*
- [ ] Reminder frequencies *(blocked on 1.3 Reminder Engine — no channels exist to send through yet)*
- [ ] Risk thresholds *(blocked on 1.7 Customer Risk Scoring)*
- [ ] Recovery strategies *(blocked on 1.8 AI Predictive Recovery Engine)*

### 1.14 Audit & Compliance
Track and maintain complete audit trails:
- [x] All customer communications *(every reminder the engine produces is recorded in `ReminderLog` — channel, stage, status, rendered message — viewable on the Reminders page activity log)*
- [x] Recovery actions *(`RecoveryAction` log, browsable via Cases page)*
- [x] System changes *(`AuditLog`: import, override, case status/assignment changes — new Admin-only **Audit Log** page)*
- [x] Payment history *(`amountReceived` on RecoveryAction; "Payment received" action type)*
- [x] Escalation history *(`AuditLog` PTP_AUTO_ESCALATED events, also on Audit Log page)*

### 1.15 Notifications Center
Real-time alerts for:
- [x] Loans due today
- [x] Overdue accounts
- [x] Missed promises to pay
- [x] High-risk customers *(Doubtful/Impaired recovery tier, proxy until 1.7 risk scoring exists)*
- [x] Collector inactivity *(officers with assigned cases, no logged action in 7 days)*
- [x] Escalation events *(auto-escalated PTP breaks, from AuditLog)*

Implemented as `/api/notifications` + a new **Notifications** page (linked
from the sidebar), polled on load rather than pushed (no WebSocket/SSE
infra yet — still "live" in the sense every other page in this app is:
force-dynamic reads, no caching).

---

## 2. Technical Requirements

### Frontend
- [x] React / Next.js *(Next.js 16 App Router, React 19)*
- [x] Responsive UI *(Tailwind responsive grids throughout)*
- [x] Dark & Light Mode *(class-based theme toggle in the sidebar, persisted to localStorage, no-flash init script; `dark:` variants across all pages)*
- [x] Real-time Dashboards *(force-dynamic reads, no caching — every page reflects live data on load)*

### Backend
- [~] Node.js / NestJS *(Node via Next.js route handlers; NestJS intentionally not used — the API layer is Next.js Route Handlers)*
- [~] Python AI Services *(AI/predictive logic implemented in-process in TypeScript, see 1.7/1.8; a separate Python service is the drop-in point if an external model is later required)*
- [x] REST API *(Next.js Route Handlers under `/api/*`)*
- [ ] GraphQL Support *(not implemented — would duplicate the existing REST surface; deferred unless a consumer needs it)*

### Database
- [x] PostgreSQL *(Prisma 7 + `@prisma/adapter-pg` against Neon Postgres)*
- [ ] Redis Caching *(needs a Redis instance; reads are currently force-dynamic, so no cache layer exists yet)*

### Security
- [x] Role-Based Access Control *(Superadmin / Admin / Manager / Officer / Viewer, enforced server-side on every gated route + client-side nav)*
- [x] Multi-Factor Authentication *(in-house TOTP per RFC 6238 — `lib/totp.ts`, validated against RFC test vectors; enrol/disable on the new `/security` page, enforced at sign-in via NextAuth `authorize` + a credential pre-check; no external service)*
- [x] Encryption at Rest *(integration credentials encrypted via AES-256-GCM, `lib/crypto.ts`; Neon also encrypts the underlying volume)*
- [x] Encryption in Transit *(all traffic over HTTPS/TLS on Vercel; Postgres connection over TLS)*
- [x] Activity Logging *(`AuditLog` across imports, overrides, case changes, escalations, credential changes, target changes, legal actions)*

### Integrations
- [ ] 🔑 CRM
- [ ] 🔑 ERP
- [ ] 🔑 Microsoft Dynamics NAV
- [ ] 🔑 Business Central
- [ ] 🔑 WhatsApp Business API
- [ ] 🔑 SMS Gateway
- [ ] 🔑 Email SMTP
- [ ] 🔑 M-Pesa API

---

## Settings & Credentials (Superadmin only)

All items below require **your input** (API keys, tokens, secrets, endpoints).
They must be entered and managed in a dedicated **Settings → Integrations** page
that is **visible and editable only to the Superadmin role**. Secrets are stored
encrypted at rest and never exposed to lower roles or the client.

| Integration | Credentials needed from you | Status |
|---|---|---|
| WhatsApp Business API | Access token, Phone number ID, App secret, Webhook verify token | [ ] |
| SMS Gateway | API key/secret, Sender ID, Base URL | [ ] |
| Email (SMTP) | Host, Port, Username, Password, From address | [ ] |
| Mobile Push | FCM/APNs server key / credentials | [ ] |
| Voice Calls | Provider API key/secret, Caller ID | [ ] |
| M-Pesa (Daraja) | Consumer key, Consumer secret, Shortcode, Passkey, Callback URL | [ ] |
| Airtel Money | Client ID, Client secret, Callback URL | [ ] |
| Bank integrations | Per-bank API credentials / SFTP details | [ ] |
| Card / Online Gateway | Public key, Secret key, Webhook secret | [ ] |
| Maps / GPS / Routing | Maps API key (e.g. Google Maps) | [ ] |
| AI / Predictive service | Model API key & endpoint | [ ] |
| Credit score provider | API key / credentials | [ ] |
| CRM | Base URL, API key/OAuth credentials | [ ] |
| ERP | Base URL, API key/OAuth credentials | [ ] |
| Microsoft Dynamics NAV | Tenant, Client ID, Client secret, Environment | [ ] |
| Business Central | Tenant, Client ID, Client secret, Environment | [ ] |

**Implementation notes**
- [x] Add a `Superadmin` role (above `Admin`) *(seeded system admin account promoted to `Superadmin`; role is a free-text field so no enum migration needed)*
- [x] Settings model with encrypted secret storage (encryption at rest) *(`IntegrationSetting` model; AES-256-GCM via `lib/crypto.ts`, key from `SETTINGS_ENCRYPTION_KEY` env var)*
- [x] Settings → Integrations UI, gated server-side and client-side to Superadmin *(`/settings/integrations` page + `/api/settings/integrations` route, both check `role === 'Superadmin'`)*
- [x] Each integration: connection test button + last-verified timestamp *(`/api/settings/integrations/test` — currently a stub that confirms credentials are saved; replace with a real provider handshake once that integration's actual keys are supplied)*
- [x] Audit-log every change to credentials (who/when/what — never log secret values) *(`AuditLog` entries `INTEGRATION_CREDENTIALS_UPDATED` / `INTEGRATION_CONNECTION_TESTED` log the integration key and field names only, never values)*

All 15 integrations from the table above are scaffolded in `lib/integrations.ts`
with their credential fields, ready to receive real keys — entering them
unblocks the corresponding 🔑 roadmap items (1.3, 1.7's external provider,
1.9's maps/GPS, 1.11, Section 2 Integrations) without further code changes
to the storage layer.

---

## How we work this list
1. Pick the next unchecked item (top-to-bottom unless reprioritised).
2. Implement it.
3. Commit & push to GitHub.
4. Tick the checkbox here and update status, then move to the next item.
