import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError } from "@/lib/api";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/connect/dashboard - one-time link to the provider's Stripe Express dashboard (payouts, balance, tax). */
export const POST = handle(async () => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  if (!isStripeConfigured()) throw new HttpError(503, "Payments are not configured on this server yet", "STRIPE_NOT_CONFIGURED");
  const p = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { stripeAccountId: true } });
  if (!p.stripeAccountId) throw new HttpError(409, "Connect Stripe first", "NOT_CONNECTED");
  const link = await getStripe().accounts.createLoginLink(p.stripeAccountId);
  return NextResponse.json({ url: link.url });
});
