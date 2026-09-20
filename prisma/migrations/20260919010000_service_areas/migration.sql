-- Mobile providers can describe and restrict where they travel.
ALTER TABLE "User"
  ADD COLUMN "serviceAreas" TEXT,
  ADD COLUMN "serviceAreaCodes" TEXT;

ALTER TABLE "Booking" ADD COLUMN "postcode" TEXT;
