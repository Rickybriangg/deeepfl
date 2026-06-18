-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Officer',
    "region" TEXT,
    "countyScope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "droppedRowCount" INTEGER NOT NULL DEFAULT 0,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'Pending',
    "overrideReason" TEXT,
    "overriddenById" TEXT,
    "notes" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "loanNo" TEXT NOT NULL,
    "memberNo" TEXT,
    "borrowerName" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "disbursementDate" TIMESTAMP(3),
    "repaymentStartDate" TIMESTAMP(3),
    "expectedCompletionDate" TIMESTAMP(3),
    "lastPayDate" TIMESTAMP(3),
    "loanTenor" INTEGER,
    "approvedAmount" TEXT NOT NULL,
    "disbursedAmount" TEXT NOT NULL,
    "totalPaid" TEXT NOT NULL,
    "outstandingBalance" TEXT NOT NULL,
    "daysInArrears" INTEGER NOT NULL DEFAULT 0,
    "classification" TEXT NOT NULL,
    "countyCode" INTEGER,
    "arrearsBucket" TEXT,
    "recoveryTier" TEXT,
    "dormancyDays" INTEGER,
    "isMatured" BOOLEAN NOT NULL DEFAULT false,
    "isCreditBalance" BOOLEAN NOT NULL DEFAULT false,
    "creditBalanceType" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialIntermediary" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "county" TEXT,
    "disbursed" TEXT NOT NULL,
    "principalRecovered" TEXT NOT NULL,
    "interestRecovered" TEXT NOT NULL,
    "principalOutstanding" TEXT NOT NULL,
    "interestOutstanding" TEXT NOT NULL,
    "defaultPenalty" TEXT NOT NULL,
    "totalOutstanding" TEXT NOT NULL,

    CONSTRAINT "FinancialIntermediary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCase" (
    "id" TEXT NOT NULL,
    "loanNo" TEXT NOT NULL,
    "assignedOfficerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "priorityTier" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryAction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "outcome" TEXT,
    "amountPromised" TEXT,
    "amountReceived" TEXT,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanNo_key" ON "Loan"("loanNo");

-- CreateIndex
CREATE INDEX "Loan_product_idx" ON "Loan"("product");

-- CreateIndex
CREATE INDEX "Loan_classification_idx" ON "Loan"("classification");

-- CreateIndex
CREATE INDEX "Loan_recoveryTier_idx" ON "Loan"("recoveryTier");

-- CreateIndex
CREATE INDEX "Loan_countyCode_idx" ON "Loan"("countyCode");

-- CreateIndex
CREATE INDEX "Loan_arrearsBucket_idx" ON "Loan"("arrearsBucket");

-- CreateIndex
CREATE INDEX "Loan_isMatured_idx" ON "Loan"("isMatured");

-- CreateIndex
CREATE INDEX "Loan_isCreditBalance_idx" ON "Loan"("isCreditBalance");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCase_loanNo_key" ON "RecoveryCase"("loanNo");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialIntermediary" ADD CONSTRAINT "FinancialIntermediary_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_loanNo_fkey" FOREIGN KEY ("loanNo") REFERENCES "Loan"("loanNo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCase" ADD CONSTRAINT "RecoveryCase_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RecoveryCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryAction" ADD CONSTRAINT "RecoveryAction_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
