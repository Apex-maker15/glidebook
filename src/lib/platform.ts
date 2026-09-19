/**
 * Client-safe platform constants: fee policy and the countries providers can
 * register their Stripe account in. Server-only Stripe helpers live in payments.ts.
 */
function clamp(n: number, lo: number, hi: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

export const PLATFORM_FEE_PERCENT = clamp(Number(process.env.PLATFORM_FEE_PERCENT ?? 3), 0, 30);
export const PLATFORM_FEE_MIN_CENTS = clamp(Number(process.env.PLATFORM_FEE_MIN_CENTS ?? 30), 0, 500);

/** GlideBook's cut of a deposit in minor units; never more than the deposit itself. */
export function platformFeeFor(depositCents: number): number {
  if (depositCents <= 0 || PLATFORM_FEE_PERCENT === 0) return 0;
  const pct = Math.round((depositCents * PLATFORM_FEE_PERCENT) / 100);
  return Math.min(depositCents, Math.max(PLATFORM_FEE_MIN_CENTS, pct));
}

/** Countries Stripe Express supports that match the currencies we offer. */
export const COUNTRIES = [
  { code: "GB", label: "United Kingdom", currency: "gbp" },
  { code: "IE", label: "Ireland", currency: "eur" },
  { code: "US", label: "United States", currency: "usd" },
  { code: "DE", label: "Germany", currency: "eur" },
  { code: "FR", label: "France", currency: "eur" },
  { code: "ES", label: "Spain", currency: "eur" },
  { code: "IT", label: "Italy", currency: "eur" },
  { code: "NL", label: "Netherlands", currency: "eur" },
  { code: "BE", label: "Belgium", currency: "eur" },
  { code: "PT", label: "Portugal", currency: "eur" },
  { code: "AT", label: "Austria", currency: "eur" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];
export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

export function countryForCurrency(currency: string): CountryCode {
  return COUNTRIES.find((c) => c.currency === currency)?.code ?? "GB";
}
