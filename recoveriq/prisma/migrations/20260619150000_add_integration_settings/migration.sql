-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "config" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_key_key" ON "IntegrationSetting"("key");

-- DataMigration: promote the seeded system admin account to Superadmin so
-- the new Settings -> Integrations area (Superadmin-only) is reachable
-- without a manual DB edit.
UPDATE "User" SET "role" = 'Superadmin' WHERE "email" = 'admin@yedf.go.ke' AND "role" = 'Admin';
