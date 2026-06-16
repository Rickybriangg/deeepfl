# RecoverIQ — YEDF Loan Recovery System

Loan recovery operations system for the Youth Enterprise Development Fund (YEDF) Credit Unit, Kenya.

## Quick Start

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Open http://localhost:3000 and log in.

## Test Credentials

| Role    | Email                   | Password     |
|---------|-------------------------|--------------|
| Admin   | admin@yedf.go.ke        | admin123     |
| Manager | manager@yedf.go.ke      | manager123   |
| Officer | officer@yedf.go.ke      | officer123   |

## Tech Stack

- **Next.js 16** — App Router + TypeScript + Tailwind CSS
- **Prisma ORM** — SQLite (dev); switch to PostgreSQL by changing `datasource` in `prisma/schema.prisma`
- **NextAuth v4** — credentials provider + JWT + role-based access control
- **Recharts** — portfolio charts
- **SheetJS (xlsx)** — Excel import/export
- **TanStack Table** — sortable/filterable data tables
- **Zod** — API boundary validation
- **Decimal.js** — money arithmetic (never floats)
- **Vitest** — unit tests
- **Playwright** — E2E tests

## Project Structure

```
recoveriq/
├── app/
│   ├── (app)/              # Authenticated app shell
│   │   ├── dashboard/      # KPI dashboard
│   │   ├── import/         # Import engine (Milestone 1)
│   │   ├── portfolio/      # Portfolio analytics (Milestone 2)
│   │   ├── watchlist/      # Worklists & bulk-assign (Milestone 3)
│   │   ├── cases/          # Case management (Milestone 4)
│   │   ├── reports/        # Exports & reporting (Milestone 6)
│   │   └── users/          # User management (Admin only)
│   ├── api/
│   │   └── auth/           # NextAuth handler
│   └── login/              # Unauthenticated login page
├── components/             # Shared UI components
├── lib/                    # Utilities: prisma, format, counties, recovery-logic
├── prisma/                 # Schema, migrations, seed
├── types/                  # Domain type definitions
└── __tests__/              # Vitest unit tests
```

## Running Tests

```bash
npm run test          # Vitest unit tests (once)
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright E2E
```

## Switching to PostgreSQL (Production)

In `prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "postgresql"   # was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then update `DATABASE_URL` in `.env` to your PostgreSQL connection string and run `npx prisma migrate deploy`.

## Recovery Logic

Implemented in `lib/recovery-logic.ts` and covered by unit tests in `__tests__/recovery-logic.test.ts`:

- **Arrears buckets**: Current / 1-30 / 31-90 / 91-180 / 181-360 / 360+
- **Recovery tier** (in precedence order):
  - *Curable* — arrears ≤ 30 and class ∈ {Normal, Watch}
  - *Impaired* — class = Loss or arrears > 360
  - *At-risk* — arrears ≤ 180 and class ∈ {Watch, Substandard, Doubtful}
  - *Doubtful* — everything else
- **NPL**: Substandard | Doubtful | Loss
- **Credit balance**: outstandingBalance < 0 → True overpayment (totalPaid > disbursed) or Likely misposting
