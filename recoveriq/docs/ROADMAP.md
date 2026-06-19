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
- [ ] Collection Performance
- [ ] Recovery Rate
- [x] Default Rate
- [ ] Loan Aging Analysis
- [ ] Collector Performance Ranking
- [ ] Branch Performance
- [ ] Recovery Trends

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
- [ ] 🔑 WhatsApp (WhatsApp Business API)
- [ ] 🔑 SMS (SMS Gateway)
- [ ] 🔑 Email (SMTP)
- [ ] 🔑 Mobile Push Notifications
- [ ] 🔑 Voice Calls (optional)
- [ ] CRM Internal Notifications

Reminder schedule (all templates configurable):
- [ ] Before due date: 14 days / 7 days / 3 days / 1 day before
- [ ] Due date: morning reminder / afternoon reminder
- [ ] After due date: Day 1 / Day 3 / Day 7 / Day 14 / Day 30 overdue
- [ ] Configurable message templates per channel & stage

### 1.4 Collection Workflow Automation
Automatic workflows, each stage triggered by predefined rules:
- [ ] Level 1 — Friendly reminder
- [ ] Level 2 — Urgent notification
- [ ] Level 3 — Recovery officer assignment
- [ ] Level 4 — Supervisor escalation
- [ ] Level 5 — Legal recovery escalation

### 1.5 Recovery Officer Management
- [ ] Recovery Officer Dashboard
- [ ] Assigned Accounts List
- [ ] Visit Scheduling
- [ ] Call Logs
- [ ] Follow-up Notes
- [ ] Promise-to-Pay Tracking
- [ ] Collector Performance Metrics
- [ ] Recovery Targets

### 1.6 Promise-to-Pay (PTP) Management
Allow collectors to:
- [ ] Record PTP commitments
- [ ] Set commitment dates
- [ ] Monitor compliance
- [ ] Trigger alerts when broken
- [ ] Escalate failed commitments automatically

### 1.7 Customer Risk Scoring
AI-powered risk scoring using: repayment history, loan utilization, missed
payments, customer income, credit score, previous defaults.
- [ ] Scoring model / engine
- [ ] Risk bands: Low / Medium / High / Critical
- [ ] 🔑 External credit score provider (if used)

### 1.8 AI Predictive Recovery Engine
Predictive analytics to:
- [ ] Predict likelihood of default
- [ ] Predict payment probability
- [ ] Recommend best collection strategy
- [ ] Prioritize accounts by recovery potential
- [ ] Forecast monthly collections
- [ ] 🔑 AI service provider / model API (if external)

### 1.9 Field Recovery Module
Recovery agents (mobile app) should have:
- [ ] Mobile Application
- [ ] 🔑 GPS Tracking (maps provider)
- [ ] 🔑 Route Optimization (maps/routing API)
- [ ] Visit Scheduling
- [ ] Customer Check-in
- [ ] Photo Capture
- [ ] Document Upload
- [ ] Digital Signature Capture
- [ ] Offline Mode

### 1.10 Legal Recovery Management
- [ ] Demand Letters
- [ ] Legal Notices
- [ ] Court Cases
- [ ] Asset Repossession
- [ ] Recovery Documentation
- [ ] Lawyer Assignments
- [ ] Status & timeline tracking

### 1.11 Payment Integration
Integrate with:
- [ ] 🔑 M-Pesa
- [ ] 🔑 Airtel Money
- [ ] 🔑 Banks
- [ ] 🔑 Card Payments
- [ ] 🔑 Online Payment Gateway

Automatically:
- [ ] Reconcile payments
- [ ] Update balances
- [ ] Close installments
- [ ] Generate receipts

### 1.12 Reports & Analytics
Generate:
- [ ] Recovery Reports
- [ ] Daily Collection Report
- [ ] Collector Performance Report
- [ ] Overdue Analysis
- [ ] Aging Report
- [ ] Default Report
- [ ] Portfolio Risk Report
- [ ] Recovery Trend Analysis
- [ ] Branch Comparison Report

Export formats:
- [ ] PDF
- [ ] Excel
- [ ] CSV

### 1.13 Automation Rules Engine
Administrators configure (without modifying code):
- [ ] Reminder frequencies
- [ ] Escalation timelines
- [ ] Collector assignment logic
- [ ] Risk thresholds
- [ ] Legal trigger points
- [ ] Recovery strategies

### 1.14 Audit & Compliance
Track and maintain complete audit trails:
- [ ] All customer communications
- [ ] Recovery actions
- [ ] System changes
- [ ] Payment history
- [ ] Escalation history

### 1.15 Notifications Center
Real-time alerts for:
- [ ] Loans due today
- [ ] Overdue accounts
- [ ] Missed promises to pay
- [ ] High-risk customers
- [ ] Collector inactivity
- [ ] Escalation events

---

## 2. Technical Requirements

### Frontend
- [ ] React / Next.js
- [ ] Responsive UI
- [ ] Dark & Light Mode
- [ ] Real-time Dashboards

### Backend
- [ ] Node.js / NestJS
- [ ] Python AI Services
- [ ] REST API
- [ ] GraphQL Support

### Database
- [ ] PostgreSQL
- [ ] Redis Caching

### Security
- [ ] Role-Based Access Control
- [ ] Multi-Factor Authentication
- [ ] Encryption at Rest
- [ ] Encryption in Transit
- [ ] Activity Logging

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
- [ ] Add a `Superadmin` role (above `Admin`) or scope this page to a designated superadmin account.
- [ ] Settings model with encrypted secret storage (encryption at rest).
- [ ] Settings → Integrations UI, gated server-side and client-side to Superadmin.
- [ ] Each integration: connection test button + last-verified timestamp.
- [ ] Audit-log every change to credentials (who/when/what — never log secret values).

---

## How we work this list
1. Pick the next unchecked item (top-to-bottom unless reprioritised).
2. Implement it.
3. Commit & push to GitHub.
4. Tick the checkbox here and update status, then move to the next item.
