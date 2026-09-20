import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/platform";

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24-hour) format");

export const timeWindowSchema = z
  .object({ start: hhmm, end: hhmm })
  .refine((w) => w.start < w.end, { message: "Window must end after it starts", path: ["end"] });

export const availabilitySlotsSchema = z.object({
  windows: z.array(timeWindowSchema).max(6),
  breaks: z.array(timeWindowSchema).max(6),
});

export const availabilityUpsertSchema = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        slots: availabilitySlotsSchema,
      }),
    )
    .max(7),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(128),
  businessName: z.string().trim().min(2).max(80),
  category: z.enum(["NAILS_BEAUTY", "HAIR_BARBER", "CAR_DETAILING", "PET_GROOMING", "OTHER"]),
  timezone: z.string().min(3).max(64),
  currency: z.enum(["gbp", "usd", "eur"]).default("gbp"),
  country: z.enum(COUNTRY_CODES).optional(),
  locationMode: z.enum(["STUDIO", "MOBILE"]).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().nullable(),
  durationMinutes: z.number().int().min(15).max(720),
  priceCents: z.number().int().min(100).max(1_000_000),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createBookingSchema = z.object({
  providerId: z.string().min(1),
  serviceId: z.string().min(1),
  startTime: z.iso.datetime({ offset: true }),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.email().max(160),
    phone: z.string().trim().max(32).optional().nullable(),
  }),
  // Required only when the provider travels to the client (validated in the route).
  address: z.string().trim().max(200).optional().nullable(),
  postcode: z.string().trim().max(12).optional().nullable(),
  serviceDetails: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateBookingStatusSchema = z.object({
  // PAID is only accepted for deposits collected outside GlideBook (payment links), marked by the provider.
  status: z.enum(["CONFIRMED", "CANCELLED", "PAID"]),
});

/** Small images travel inline as data URLs; the browser resizes before upload, this is the hard ceiling. */
function imageDataUrl(maxChars: number) {
  return z
    .string()
    .max(maxChars, `Image is too large - try a smaller one (max ${Math.round(maxChars / 1400)} KB)`)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Upload a JPEG, PNG or WebP image");
}

export const providerSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(80).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letters, numbers and single dashes, e.g. shine-detailing")
    .min(3)
    .max(48)
    .optional(),
  email: z.email().max(160).optional(),
  phone: z.string().trim().max(32).optional().nullable(),
  timezone: z.string().min(3).max(64).optional(),
  currency: z.enum(["gbp", "usd", "eur"]).optional(),
  country: z.enum(COUNTRY_CODES).optional(),
  locationMode: z.enum(["STUDIO", "MOBILE"]).optional(),
  studioAddress: z.string().trim().max(200).optional().nullable(),
  serviceAreas: z.string().trim().max(300).optional().nullable(),
  serviceAreaCodes: z.string().trim().max(300).optional().nullable(),
  depositPercent: z.number().int().min(10).max(100).optional(),
  depositLinkUrl: z.url({ protocol: /^https$/ }).max(300).optional().nullable(),
  tagline: z.string().trim().max(90).optional().nullable(),
  bio: z.string().trim().max(1500).optional().nullable(),
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{0,30}$/, "That does not look like an Instagram handle"))
    .optional()
    .nullable(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1f8fdd")
    .optional()
    .nullable(),
  logoData: imageDataUrl(260_000).optional().nullable(),
  coverData: imageDataUrl(480_000).optional().nullable(),
  gallery: z.array(imageDataUrl(240_000)).max(6).optional(),
  cancelNoticeHours: z.number().int().min(0).max(168).optional(),
  slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
  bufferMinutes: z.number().int().min(0).max(180).optional(),
  minNoticeMinutes: z.number().int().min(0).max(10080).optional(),
  bookingHorizonDays: z.number().int().min(1).max(365).optional(),
});

export const reviewSchema = z.object({
  token: z.string().min(8),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(600).optional().nullable(),
});

export function flattenIssues(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
