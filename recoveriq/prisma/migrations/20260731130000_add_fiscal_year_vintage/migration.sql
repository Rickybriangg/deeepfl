-- CreateTable
CREATE TABLE "FiscalYearVintage" (
    "id" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "sortKey" INTEGER NOT NULL,
    "approvedAmount" TEXT NOT NULL,
    "outstandingBalance" TEXT NOT NULL,
    "amountDue" TEXT NOT NULL,
    "amountRecovered" TEXT NOT NULL,
    "recoveryRate" DOUBLE PRECISION,
    "loansIssued" INTEGER NOT NULL,
    "isAggregate" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYearVintage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalYearVintage_fiscalYear_key" ON "FiscalYearVintage"("fiscalYear");

-- CreateIndex
CREATE INDEX "FiscalYearVintage_sortKey_idx" ON "FiscalYearVintage"("sortKey");
