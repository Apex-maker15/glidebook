import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { bookingInclude, toBookingDTO } from "@/lib/bookings";
import { publish } from "@/lib/realtime";
import { notifyBookingConfirmed } from "@/lib/notifications";
import { applyAccount } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 * Verifies the Stripe signature on the raw body, records the event id for
 * idempotency, then transitions the booking. Must NOT go through any JSON
 * body parsing before signature verification.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn("[stripe] signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // At-least-once delivery: a duplicate id means we already handled it.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await markPaid(event.data.object);
        break;
      case "payment_intent.canceled":
        await markCancelled(event.data.object);
        break;
      case "charge.refunded":
        await markRefunded(event.data.object);
        break;
      case "account.updated":
        await syncAccount(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    // Let Stripe retry; drop the idempotency row so the retry is processed.
    console.error(`[stripe] failed to process ${event.type} ${event.id}`, err);
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function findBooking(intent: Stripe.PaymentIntent) {
  const byIntent = await prisma.booking.findUnique({ where: { paymentIntentId: intent.id } });
  if (byIntent) return byIntent;
  const bookingId = intent.metadata?.bookingId;
  return bookingId ? prisma.booking.findUnique({ where: { id: bookingId } }) : null;
}

async function markSetupPaid(intent: Stripe.PaymentIntent) {
  const byIntent = await prisma.setupRequest.findUnique({ where: { paymentIntentId: intent.id } });
  const request = byIntent ?? (intent.metadata?.setupRequestId ? await prisma.setupRequest.findUnique({ where: { id: intent.metadata.setupRequestId } }) : null);
  if (!request) {
    console.warn(`[stripe] setup payment for unknown request (${intent.id})`);
    return;
  }
  if (request.status !== "PENDING_PAYMENT") return;
  await prisma.setupRequest.update({
    where: { id: request.id },
    data: { status: "PAID", paidAt: new Date(), paymentIntentId: intent.id },
  });
}

async function markPaid(intent: Stripe.PaymentIntent) {
  if (intent.metadata?.kind === "setup") return markSetupPaid(intent);
  const booking = await findBooking(intent);
  if (!booking) {
    console.warn(`[stripe] payment_intent.succeeded for unknown booking (${intent.id})`);
    return;
  }
  if (booking.status === BookingStatus.PAID) return;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.PAID, paidAt: new Date(), paymentIntentId: intent.id },
    include: bookingInclude,
  });
  await publish({ type: "booking.updated", providerId: updated.providerId, booking: toBookingDTO(updated) });
  await notifyBookingConfirmed(updated.id);
}

async function markCancelled(intent: Stripe.PaymentIntent) {
  if (intent.metadata?.kind === "setup") return;
  const booking = await findBooking(intent);
  if (!booking || booking.status !== BookingStatus.PENDING) return;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELLED },
    include: bookingInclude,
  });
  await publish({ type: "booking.updated", providerId: updated.providerId, booking: toBookingDTO(updated) });
}

/** Connected account finished onboarding (or lost a capability): keep the provider's flags in step. */
async function syncAccount(account: Stripe.Account) {
  const provider =
    (await prisma.user.findUnique({ where: { stripeAccountId: account.id }, select: { id: true } })) ??
    (account.metadata?.providerId ? await prisma.user.findUnique({ where: { id: account.metadata.providerId }, select: { id: true } }) : null);
  if (!provider) return;
  await applyAccount(provider.id, account);
}

async function markRefunded(charge: Stripe.Charge) {
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId || !charge.refunded) return;
  const booking = await prisma.booking.findUnique({ where: { paymentIntentId: intentId } });
  if (!booking || booking.status === BookingStatus.CANCELLED) return;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELLED },
    include: bookingInclude,
  });
  await publish({ type: "booking.updated", providerId: updated.providerId, booking: toBookingDTO(updated) });
}
