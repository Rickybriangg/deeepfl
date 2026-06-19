-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "branch" TEXT;

-- CreateIndex
CREATE INDEX "Loan_branch_idx" ON "Loan"("branch");

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalOutstanding" TEXT NOT NULL,
    "totalOverdue" TEXT NOT NULL,
    "totalAccounts" INTEGER NOT NULL,
    "recoveryRate" DOUBLE PRECISION,
    "nplRatio" DOUBLE PRECISION,
    "par30" DOUBLE PRECISION,
    "defaultRate" DOUBLE PRECISION,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_capturedAt_idx" ON "PortfolioSnapshot"("capturedAt");
