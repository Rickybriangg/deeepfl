-- CreateTable
CREATE TABLE "LegalCase" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "lawyerName" TEXT,
    "courtName" TEXT,
    "filingDate" TIMESTAMP(3),
    "hearingDate" TIMESTAMP(3),
    "resolutionDate" TIMESTAMP(3),
    "notes" TEXT,
    "documentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalCase_caseId_idx" ON "LegalCase"("caseId");

-- CreateIndex
CREATE INDEX "LegalCase_status_idx" ON "LegalCase"("status");

-- AddForeignKey
ALTER TABLE "LegalCase" ADD CONSTRAINT "LegalCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RecoveryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
