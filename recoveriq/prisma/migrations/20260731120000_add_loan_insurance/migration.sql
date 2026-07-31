-- CreateTable
CREATE TABLE "InsuranceTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "coverageType" TEXT NOT NULL,
    "coverageBasis" TEXT NOT NULL DEFAULT 'outstanding',
    "coveragePercent" TEXT NOT NULL,
    "premiumRate" TEXT NOT NULL,
    "termMonths" INTEGER,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanInsurance" (
    "id" TEXT NOT NULL,
    "loanNo" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "policyNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "coverageBasis" TEXT NOT NULL,
    "coveragePercent" TEXT NOT NULL,
    "premiumRate" TEXT NOT NULL,
    "insuredAmount" TEXT NOT NULL,
    "premiumAmount" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceTemplate_name_key" ON "InsuranceTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LoanInsurance_policyNo_key" ON "LoanInsurance"("policyNo");

-- CreateIndex
CREATE INDEX "LoanInsurance_loanNo_idx" ON "LoanInsurance"("loanNo");

-- CreateIndex
CREATE INDEX "LoanInsurance_templateId_idx" ON "LoanInsurance"("templateId");

-- CreateIndex
CREATE INDEX "LoanInsurance_status_idx" ON "LoanInsurance"("status");

-- AddForeignKey
ALTER TABLE "LoanInsurance" ADD CONSTRAINT "LoanInsurance_loanNo_fkey" FOREIGN KEY ("loanNo") REFERENCES "Loan"("loanNo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanInsurance" ADD CONSTRAINT "LoanInsurance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InsuranceTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
