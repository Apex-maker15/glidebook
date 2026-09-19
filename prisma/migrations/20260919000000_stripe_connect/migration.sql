-- Stripe Connect (Express) per provider + platform fee snapshot per booking.
ALTER TABLE "User"
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'GB',
  ADD COLUMN "stripeAccountId" TEXT,
  ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "User"("stripeAccountId");

-- Existing providers keep a sensible country for their currency.
UPDATE "User" SET "country" = 'US' WHERE "currency" = 'usd';
UPDATE "User" SET "country" = 'IE' WHERE "currency" = 'eur';

ALTER TABLE "Booking" ADD COLUMN "platformFeeCents" INTEGER NOT NULL DEFAULT 0;
