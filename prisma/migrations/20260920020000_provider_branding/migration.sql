-- Public page branding: tagline, bio, Instagram, accent colour, inline logo and cover images.
ALTER TABLE "User"
  ADD COLUMN "tagline" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "instagram" TEXT,
  ADD COLUMN "accentColor" TEXT,
  ADD COLUMN "logoData" TEXT,
  ADD COLUMN "coverData" TEXT;
