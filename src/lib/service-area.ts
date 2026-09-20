/**
 * Service-area rules for mobile providers. Coverage is expressed as ZIP /
 * postcode prefixes ("850, 852" or "CR0, SE1, SW"), matched case- and
 * space-insensitively against the start of the client's code. An empty list
 * means "anywhere".
 */
export function parseAreaCodes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n;]+/)
    .map((c) => c.replace(/\s+/g, "").toUpperCase())
    .filter((c) => c.length >= 2 && c.length <= 8);
}

export function normalisePostcode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function postcodeInArea(postcode: string, codes: string[]): boolean {
  if (codes.length === 0) return true;
  const value = normalisePostcode(postcode);
  return codes.some((c) => value.startsWith(c));
}

/** What to call the field for this provider's country. */
export function postcodeLabel(country: string): string {
  return country === "US" ? "ZIP code" : country === "IE" ? "Eircode" : "Postcode";
}

export function postcodePlaceholder(country: string): string {
  return country === "US" ? "85004" : country === "IE" ? "D02 X285" : "CR0 1AA";
}
