-- Providers without Stripe can collect deposits through their own payment link.
ALTER TABLE "User" ADD COLUMN "depositLinkUrl" TEXT;
ALTER TABLE "Booking" ADD COLUMN "depositLink" TEXT;
