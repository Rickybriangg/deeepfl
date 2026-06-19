CREATE TABLE "RiskSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mediumMin" INTEGER NOT NULL DEFAULT 25,
    "highMin" INTEGER NOT NULL DEFAULT 50,
    "criticalMin" INTEGER NOT NULL DEFAULT 75,
    "strategyLow" TEXT NOT NULL DEFAULT 'Automated friendly reminder (SMS/WhatsApp)',
    "strategyMedium" TEXT NOT NULL DEFAULT 'Officer call + payment plan offer',
    "strategyHigh" TEXT NOT NULL DEFAULT 'Field visit and restructure negotiation',
    "strategyCritical" TEXT NOT NULL DEFAULT 'Demand letter / legal escalation',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskSettings_pkey" PRIMARY KEY ("id")
);
