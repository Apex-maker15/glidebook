import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError } from "@/lib/api";
import { isStripeConfigured } from "@/lib/stripe";
import {
  PLATFORM_FEE_MIN_CENTS,
  PLATFORM_FEE_PERCENT,
  createOnboardingLink,
  syncConnectAccount,
  type ConnectStatus,
} from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const select = {
  id: true,
  email: true,
  businessName: true,
  slug: true,
  country: true,
  currency: true,
  stripeAccountId: true,
  stripeChargesEnabled: true,
  stripePayoutsEnabled: true,
  stripeDetailsSubmitted: true,
};

/**
 * GET /api/connect - the signed-in provider's payout status plus a small
 * earnings summary. Re-syncs from Stripe whenever an account exists so the
 * page is correct straight after hosted onboarding, without waiting for
 * the `account.updated` webhook.
 */
export const GET = handle(async () => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const p = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select });

  let status: ConnectStatus = {
    configured: isStripeConfigured(),
    connected: Boolean(p.stripeAccountId),
    chargesEnabled: p.stripeChargesEnabled,
    payoutsEnabled: p.stripePayoutsEnabled,
    detailsSubmitted: p.stripeDetailsSubmitted,
    requirementsDue: [],
  };
  if (status.configured && p.stripeAccountId) {
    try {
      status = await syncConnectAccount(p.id, p.stripeAccountId);
    } catch (err) {
      console.error("[connect] could not refresh account", err);
    }
  }

  const monthStart = startOfMonth(new Date());
  const [month, allTime] = await Promise.all([
    prisma.booking.aggregate({
      where: { providerId: p.id, status: BookingStatus.PAID, paidAt: { gte: monthStart } },
      _sum: { depositCents: true, platformFeeCents: true },
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: { providerId: p.id, status: BookingStatus.PAID },
      _sum: { depositCents: true, platformFeeCents: true },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json(
    {
      status,
      country: p.country,
      currency: p.currency,
      fee: { percent: PLATFORM_FEE_PERCENT, minCents: PLATFORM_FEE_MIN_CENTS },
      earnings: {
        month: {
          bookings: month._count._all,
          depositsCents: month._sum.depositCents ?? 0,
          feesCents: month._sum.platformFeeCents ?? 0,
        },
        allTime: {
          bookings: allTime._count._all,
          depositsCents: allTime._sum.depositCents ?? 0,
          feesCents: allTime._sum.platformFeeCents ?? 0,
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});

/** POST /api/connect - start (or resume) Stripe's hosted onboarding. Returns the URL to send the provider to. */
export const POST = handle(async () => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  if (!isStripeConfigured()) throw new HttpError(503, "Payments are not configured on this server yet", "STRIPE_NOT_CONFIGURED");
  const p = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select });
  const url = await createOnboardingLink(p);
  return NextResponse.json({ url });
});
