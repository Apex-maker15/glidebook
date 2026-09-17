-- CreateEnum
CREATE TYPE "SetupRequestStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'DONE');

-- CreateTable
CREATE TABLE "SetupRequest" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "SetupRequestStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "notes" TEXT NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "paymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetupRequest_paymentIntentId_key" ON "SetupRequest"("paymentIntentId");

-- CreateIndex
CREATE INDEX "SetupRequest_status_createdAt_idx" ON "SetupRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SetupRequest" ADD CONSTRAINT "SetupRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

