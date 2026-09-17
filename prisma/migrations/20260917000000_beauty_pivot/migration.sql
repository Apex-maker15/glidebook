-- CreateEnum
CREATE TYPE "LocationMode" AS ENUM ('STUDIO', 'MOBILE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BusinessCategory" ADD VALUE 'NAILS_BEAUTY';
ALTER TYPE "BusinessCategory" ADD VALUE 'HAIR_BARBER';
ALTER TYPE "BusinessCategory" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'gbp',
ADD COLUMN     "depositPercent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "locationMode" "LocationMode" NOT NULL DEFAULT 'STUDIO',
ADD COLUMN     "studioAddress" TEXT,
ALTER COLUMN "timezone" SET DEFAULT 'Europe/London';

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "currency" SET DEFAULT 'gbp';

-- AlterTable (backfill existing bookings as full-prepay, then enforce NOT NULL)
ALTER TABLE "Booking" ADD COLUMN     "depositCents" INTEGER,
ALTER COLUMN "currency" SET DEFAULT 'gbp';
UPDATE "Booking" SET "depositCents" = "amountCents" WHERE "depositCents" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "depositCents" SET NOT NULL;

-- Existing mobile providers keep their original currency and travel to the client.
UPDATE "User" SET "currency" = 'usd', "locationMode" = 'MOBILE'
WHERE "role" = 'PROVIDER' AND "category" IN ('CAR_DETAILING', 'PET_GROOMING');

