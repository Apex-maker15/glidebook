/** Public contact address for the legal pages: SUPPORT_EMAIL, else the address emails are sent from. */
export function supportEmail(): string | null {
  const explicit = process.env.SUPPORT_EMAIL?.trim();
  if (explicit) return explicit;
  const from = process.env.EMAIL_FROM ?? "";
  const bracketed = from.match(/<([^>]+)>/);
  if (bracketed) return bracketed[1];
  const bare = from.match(/[^\s<>]+@[^\s<>]+/);
  return bare ? bare[0] : null;
}

export const LEGAL_UPDATED = "22 September 2026";
