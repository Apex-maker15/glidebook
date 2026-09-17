import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson } from "@/lib/api";
import { bookingInclude, toBookingDTO } from "@/lib/bookings";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { publish } from "@/lib/realtime";
import { notifyBookingCancelled } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(8) });

/**
 * POST /api/bookings/:id/cancel { token }
 * Client self-service cancellation using the secret link from their email.
 * Refunds automatically when the cancellation is outside the provider's notice window.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { token } = bodySchema.parse(await readJson(req));

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { ...bookingInclude, provider: { select: { cancelNoticeHours: true } } },
  });
  if (!booking || booking.manageToken !== token) throw new HttpError(404, "Booking not found", "NOT_FOUND");
  if (booking.status === BookingStatus.CANCELLED) throw new HttpError(409, "This booking is already cancelled", "ALREADY_CANCELLED");
  if (booking.endTime < new Date()) throw new HttpError(409, "This appointment has already happened", "IN_PAST");

  const hoursUntil = (booking.startTime.getTime() - Date.now()) / 3_600_000;
  const refundable = hoursUntil >= booking.provider.cancelNoticeHours;

  let refunded = false;
  if (booking.paymentIntentId && isStripeConfigured()) {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
    if (pi.status === "succeeded") {
      if (refundable) {
        await stripe.refunds.create({ payment_intent: pi.id, reason: "requested_by_customer" }, { idempotencyKey: `refund_${booking.id}` });
        refunded = true;
      }
    } else if (pi.status !== "canceled") {
      await stripe.paymentIntents.cancel(pi.id);
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED, cancelledBy: "client" },
    include: bookingInclude,
  });
  await publish({ type: "booking.updated", providerId: updated.providerId, booking: toBookingDTO(updated) });
  if (booking.status !== BookingStatus.PENDING) await notifyBookingCancelled(updated.id, { refunded, byProvider: false });

  return NextResponse.json({ status: updated.status, refunded, refundable });
});
