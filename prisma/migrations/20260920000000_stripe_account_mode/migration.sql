-- Remember whether a connected account belongs to test or live mode.
ALTER TABLE "User" ADD COLUMN "stripeAccountLive" BOOLEAN NOT NULL DEFAULT false;
