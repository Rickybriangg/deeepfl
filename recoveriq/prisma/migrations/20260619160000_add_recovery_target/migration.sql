-- CreateTable
CREATE TABLE "RecoveryTarget" (
    "id" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "targetAmount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryTarget_officerId_periodMonth_key" ON "RecoveryTarget"("officerId", "periodMonth");

-- AddForeignKey
ALTER TABLE "RecoveryTarget" ADD CONSTRAINT "RecoveryTarget_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
