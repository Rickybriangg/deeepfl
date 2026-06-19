CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "paidDate" TIMESTAMP(3),
    "paidAmount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Installment_caseId_idx" ON "Installment"("caseId");
CREATE INDEX "Installment_dueDate_idx" ON "Installment"("dueDate");

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RecoveryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
