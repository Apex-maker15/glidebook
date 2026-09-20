import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/:id/review { token, rating, text }
 * The client leaves one review per booking, only after the appointment has
 * happened, using the secret from their manage link. Editable until the
 * provider's page shows it? No - one shot, but a repeat POST updates it.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  rateLimit(req, "review", 10, 60 * 60_000);
  const { id } = await ctx.params;
  const { token, rating, text } = reviewSchema.parse(await readJson(req));

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, manageToken: true, providerId: true, status: true, endTime: true, customer: { select: { name: true } } },
  });
  if (!booking || booking.manageToken !== token) throw new HttpError(404, "Booking not found", "NOT_FOUND");
  if (booking.status === BookingStatus.CANCELLED) throw new HttpError(409, "Cancelled bookings cannot be reviewed", "CANCELLED");
  if (booking.endTime > new Date()) throw new HttpError(409, "You can review once the appointment has happened", "TOO_EARLY");

  const parts = booking.customer.name.trim().split(/\s+/);
  const clientName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];

  const review = await prisma.review.upsert({
    where: { bookingId: booking.id },
    create: { bookingId: booking.id, providerId: booking.providerId, rating, text: text || null, clientName },
    update: { rating, text: text || null },
    select: { id: true, rating: true, text: true, clientName: true, createdAt: true },
  });
  return NextResponse.json({ review: { ...review, createdAt: review.createdAt.toISOString() } });
});
