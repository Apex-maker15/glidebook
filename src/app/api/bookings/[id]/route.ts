import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
import { bookingInclude, toBookingDTO } from "@/lib/bookings";
import { getStripe } from "@/lib/stripe";
import { publish } from "@/lib/realtime";
import { updateBookingStatusSchema } from "@/lib/validation";
import { notifyBookingCancelled, notifyBookingConfirmed } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/bookings/:id
 * Owner provider gets the full record; anyone else (the customer polling for
 * payment confirmation) gets a minimal, PII-free status view.
 */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new HttpError(404, "Booking not found", "NOT_FOUND");

  const session = await auth();
  if (session?.user?.id === booking.providerId) {
    return NextResponse.json({ booking: toBookingDTO(booking) }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    {
      booking: {
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        paidAt: booking.paidAt?.toISOString() ?? null,
        amountCents: booking.amountCents,
        currency: booking.currency,
        service: booking.service,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});

/** PATCH /api/bookings/:id — provider confirms or cancels (refunding if already paid). */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PROVIDER") throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");

  const { status } = updateBookingStatusSchema.parse(await readJson(req));
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.providerId !== session.user.id) throw new HttpError(404, "Booking not found", "NOT_FOUND");

  if (status === "CONFIRMED" && booking.status !== BookingStatus.PENDING) {
    throw new HttpError(409, `Cannot confirm a ${booking.status.toLowerCase()} booking`, "BAD_TRANSITION");
  }
  if (status === "CANCELLED" && booking.status === BookingStatus.CANCELLED) {
    throw new HttpError(409, "Booking is already cancelled", "BAD_TRANSITION");
  }

  let refunded = false;
  if (status === "CANCELLED" && booking.paymentIntentId) {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
    if (pi.status === "succeeded") {
      await stripe.refunds.create(
        { payment_intent: pi.id, reason: "requested_by_customer" },
        { idempotencyKey: `refund_${booking.id}` },
      );
      refunded = true;
    } else if (pi.status !== "canceled") {
      await stripe.paymentIntents.cancel(pi.id);
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status, ...(status === "CANCELLED" ? { cancelledBy: "provider" } : {}) },
    include: bookingInclude,
  });
  const dto = toBookingDTO(updated);
  await publish({ type: "booking.updated", providerId: updated.providerId, booking: dto });
  if (status === "CONFIRMED") await notifyBookingConfirmed(updated.id);
  if (status === "CANCELLED" && booking.status !== BookingStatus.PENDING) {
    await notifyBookingCancelled(updated.id, { refunded, byProvider: true });
  }
  return NextResponse.json({ booking: dto });
});
