import Stripe from "stripe";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  client = new Stripe(key, { typescript: true });
  return client;
}

function looksReal(key: string | undefined, prefix: string): boolean {
  return Boolean(key && key.startsWith(prefix) && !key.includes("...") && key.length > prefix.length + 8);
}

/** True only when both keys are present and are not the `.env.example` placeholders. */
export function isStripeConfigured(): boolean {
  return looksReal(process.env.STRIPE_SECRET_KEY, "sk_") && looksReal(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "pk_");
}

export function publishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return looksReal(key, "pk_") ? key! : null;
}
