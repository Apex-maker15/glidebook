import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { SETUP_FEE_CENTS, SETUP_FEE_CURRENCY } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  notes: z.string().trim().min(20, "Tell us a bit more so we can build your page").max(4000),
});

const select = {
  id: true,
  status: true,
  notes: true,
  feeCents: true,
  currency: true,
  paidAt: true,
  completedAt: true,
  createdAt: true,
};

/** GET /api/setup - the signed-in provider's latest done-for-you request. */
export const GET = handle(async () => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const request = await prisma.setupRequest.findFirst({
    where: { providerId: user.id, status: { in: ["PAID", "DONE"] } },
    orderBy: { createdAt: "desc" },
    select,
  });
  return NextResponse.json({ request, feeCents: SETUP_FEE_CENTS, currency: SETUP_FEE_CURRENCY });
});

/**
 * POST /api/setup { notes } - create a request and a PaymentIntent for the fee.
 * The request becomes PAID via the Stripe webhook.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  if (SETUP_FEE_CENTS > 0 && !isStripeConfigured()) {
    throw new HttpError(503, "Payments are not configured on this server yet", "STRIPE_NOT_CONFIGURED");
  }
  const { notes } = bodySchema.parse(await readJson(req));

  const existing = await prisma.setupRequest.findFirst({
    where: { providerId: user.id, status: "PAID" },
    select: { id: true },
  });
  if (existing) throw new HttpError(409, "You already have a setup in progress", "ALREADY_REQUESTED");

  if (SETUP_FEE_CENTS === 0) {
    // Free: the request goes straight into the admin queue as ready to build.
    const request = await prisma.setupRequest.create({
      data: { providerId: user.id, notes, feeCents: 0, currency: SETUP_FEE_CURRENCY, status: "PAID", paidAt: new Date() },
      select,
    });
    return NextResponse.json({ request, clientSecret: null, amountCents: 0, currency: SETUP_FEE_CURRENCY }, { status: 201 });
  }

  const request = await prisma.setupRequest.create({
    data: { providerId: user.id, notes, feeCents: SETUP_FEE_CENTS, currency: SETUP_FEE_CURRENCY },
    select,
  });

  const intent = await getStripe().paymentIntents.create(
    {
      amount: SETUP_FEE_CENTS,
      currency: SETUP_FEE_CURRENCY,
      automatic_payment_methods: { enabled: true },
      receipt_email: user.email ?? undefined,
      description: "GlideBook done-for-you setup",
      metadata: { kind: "setup", setupRequestId: request.id, providerId: user.id },
    },
    { idempotencyKey: `setup_${request.id}` },
  );
  await prisma.setupRequest.update({ where: { id: request.id }, data: { paymentIntentId: intent.id } });

  return NextResponse.json(
    { request, clientSecret: intent.client_secret, amountCents: SETUP_FEE_CENTS, currency: SETUP_FEE_CURRENCY },
    { status: 201 },
  );
});
