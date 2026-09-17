import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson } from "@/lib/api";
import { HOLD_MINUTES } from "@/lib/bookings";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ bookingId: z.string().min(1) });

/**
 * POST /api/checkout { bookingId }
 * Creates (or reuses) a Stripe PaymentIntent for the booking's snapshotted
 * price and returns the client secret for the embedded Payment Element.
 */
export const POST = handle(async (req: Request) => {
  if (!isStripeConfigured()) {
    throw new HttpError(503, "Payments are not configured on this server yet", "STRIPE_NOT_CONFIGURED");
  }
  const { bookingId } = bodySchema.parse(await readJson(req));

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: { select: { name: true } },
      provider: { select: { businessName: true } },
      customer: { select: { email: true, name: true } },
    },
  });
  if (!booking) throw new HttpError(404, "Booking not found", "NOT_FOUND");
  if (booking.status === BookingStatus.PAID) throw new HttpError(409, "This booking is already paid", "ALREADY_PAID");
  if (booking.status === BookingStatus.CANCELLED) throw new HttpError(409, "This booking was cancelled", "CANCELLED");

  const holdExpiresAt = new Date(booking.createdAt.getTime() + HOLD_MINUTES * 60_000);
  if (booking.status === BookingStatus.PENDING && holdExpiresAt < new Date()) {
    throw new HttpError(410, "Your slot hold expired. Please choose a time again.", "HOLD_EXPIRED");
  }

  const stripe = getStripe();

  if (booking.paymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
    if (existing.status !== "canceled" && existing.amount === booking.depositCents && existing.client_secret) {
      return NextResponse.json({
        clientSecret: existing.client_secret,
        paymentIntentId: existing.id,
        amountCents: booking.depositCents,
        totalCents: booking.amountCents,
        currency: booking.currency,
        holdExpiresAt: holdExpiresAt.toISOString(),
      });
    }
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: booking.depositCents,
      currency: booking.currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: booking.customer.email,
      description: `${booking.depositCents < booking.amountCents ? "Deposit for " : ""}${booking.service.name} — ${booking.provider.businessName ?? "GlideBook"}`,
      metadata: {
        bookingId: booking.id,
        providerId: booking.providerId,
        customerId: booking.customerId,
      },
    },
    { idempotencyKey: `booking_${booking.id}_${booking.depositCents}` },
  );

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentIntentId: intent.id },
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amountCents: booking.depositCents,
    totalCents: booking.amountCents,
    currency: booking.currency,
    holdExpiresAt: holdExpiresAt.toISOString(),
  });
});
