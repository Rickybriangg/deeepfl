-- AlterTable
ALTER TABLE "RecoveryCase" ADD COLUMN     "workflowLevel" INTEGER;

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "minDaysInArrears" INTEGER NOT NULL,
    "maxDaysInArrears" INTEGER,
    "action" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_level_key" ON "AutomationRule"("level");
