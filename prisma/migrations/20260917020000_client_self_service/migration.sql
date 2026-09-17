-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cancelNoticeHours" INTEGER NOT NULL DEFAULT 24;

-- AlterTable (backfill existing bookings with a random token before enforcing NOT NULL)
ALTER TABLE "Booking" ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "manageToken" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
UPDATE "Booking" SET "manageToken" = replace(gen_random_uuid()::text, '-', '') WHERE "manageToken" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "manageToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_manageToken_key" ON "Booking"("manageToken");
