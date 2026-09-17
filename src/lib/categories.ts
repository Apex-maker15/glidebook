import type { BusinessCategory } from "@prisma/client";

export interface CategoryMeta {
  label: string;
  /** Short line shown above the business name on the booking page. */
  tagline: string;
  /** data-accent value, see globals.css */
  accent: "beauty" | "hair" | "car" | "pet" | "neutral";
  /** Label + placeholder for the free-text "details" field in the booking form. */
  detailsLabel: string;
  detailsPlaceholder: string;
  /** Default location mode when registering. */
  defaultLocation: "STUDIO" | "MOBILE";
}

export const CATEGORIES: Record<BusinessCategory, CategoryMeta> = {
  NAILS_BEAUTY: {
    label: "Nails & beauty",
    tagline: "Nails, lashes & beauty",
    accent: "beauty",
    detailsLabel: "Anything we should know? (optional)",
    detailsPlaceholder: "Current set to remove, nail length, inspo, allergies",
    defaultLocation: "STUDIO",
  },
  HAIR_BARBER: {
    label: "Hair & barbering",
    tagline: "Hair & barbering",
    accent: "hair",
    detailsLabel: "Anything we should know? (optional)",
    detailsPlaceholder: "Hair type, length, previous colour, references",
    defaultLocation: "STUDIO",
  },
  CAR_DETAILING: {
    label: "Car detailing",
    tagline: "Mobile car detailing",
    accent: "car",
    detailsLabel: "Vehicle (optional)",
    detailsPlaceholder: "2021 Tesla Model 3, black",
    defaultLocation: "MOBILE",
  },
  PET_GROOMING: {
    label: "Pet grooming",
    tagline: "Mobile pet grooming",
    accent: "pet",
    detailsLabel: "Pet (optional)",
    detailsPlaceholder: "Biscuit, golden retriever, 30 kg",
    defaultLocation: "MOBILE",
  },
  OTHER: {
    label: "Other service",
    tagline: "Appointments",
    accent: "neutral",
    detailsLabel: "Anything we should know? (optional)",
    detailsPlaceholder: "Details that help us prepare",
    defaultLocation: "STUDIO",
  },
};

export const CATEGORY_ORDER: BusinessCategory[] = ["NAILS_BEAUTY", "HAIR_BARBER", "CAR_DETAILING", "PET_GROOMING", "OTHER"];

export const CURRENCIES = [
  { code: "gbp", label: "GBP (£)" },
  { code: "usd", label: "USD ($)" },
  { code: "eur", label: "EUR (€)" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

/** Stripe's minimum charge per currency, in minor units. */
export const MIN_CHARGE_CENTS: Record<string, number> = { gbp: 30, usd: 50, eur: 50 };

/** Amount actually charged at checkout for a given service price and deposit policy. */
export function depositFor(priceCents: number, depositPercent: number, currency: string): number {
  const pct = Math.min(100, Math.max(0, depositPercent));
  if (pct === 100) return priceCents;
  const raw = Math.round((priceCents * pct) / 100);
  return Math.max(MIN_CHARGE_CENTS[currency] ?? 50, Math.min(priceCents, raw));
}
