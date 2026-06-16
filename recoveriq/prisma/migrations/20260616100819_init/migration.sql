-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Officer',
    "region" TEXT,
    "countyScope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "droppedRowCount" INTEGER NOT NULL DEFAULT 0,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'Pending',
    "overrideReason" TEXT,
    "overriddenById" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importBatchId" TEXT NOT NULL,
    "loanNo" TEXT NOT NULL,
    "memberNo" TEXT,
    "borrowerName" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "disbursementDate" DATETIME,
    "repaymentStartDate" DATETIME,
    "expectedCompletionDate" DATETIME,
    "lastPayDate" DATETIME,
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
    CONSTRAINT "Loan_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialIntermediary" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "FinancialIntermediary_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecoveryCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanNo" TEXT NOT NULL,
    "assignedOfficerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "priorityTier" TEXT,
    "nextActionDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecoveryCase_loanNo_fkey" FOREIGN KEY ("loanNo") REFERENCES "Loan" ("loanNo") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecoveryCase_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecoveryAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "outcome" TEXT,
    "amountPromised" TEXT,
    "amountReceived" TEXT,
    "notes" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "RecoveryCase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecoveryAction_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
