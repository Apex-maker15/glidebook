import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { accountUsable, canTakeDeposits } from "@/lib/payments";
import { publish } from "@/lib/realtime";
import type { BookingDTO, ProviderDTO } from "@/types";

export const HOLD_MINUTES = Math.max(1, Number(process.env.BOOKING_HOLD_MINUTES ?? 15));

export const bookingInclude = {
  service: { select: { id: true, name: true, durationMinutes: true } },
  customer: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.BookingInclude;

export type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function toBookingDTO(b: BookingWithRelations): BookingDTO {
  return {
    id: b.id,
    providerId: b.providerId,
    customerId: b.customerId,
    serviceId: b.serviceId,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    amountCents: b.amountCents,
    depositCents: b.depositCents,
    currency: b.currency,
    platformFeeCents: b.platformFeeCents,
    depositLink: b.depositLink,
    paidAt: b.paidAt?.toISOString() ?? null,
    address: b.address,
    postcode: b.postcode,
    serviceDetails: b.serviceDetails,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    service: b.service,
    customer: b.customer,
  };
}

export const providerSelect = {
  id: true,
  slug: true,
  businessName: true,
  name: true,
  category: true,
  timezone: true,
  currency: true,
  locationMode: true,
  studioAddress: true,
  serviceAreas: true,
  serviceAreaCodes: true,
  depositPercent: true,
  depositLinkUrl: true,
  cancelNoticeHours: true,
  slotIntervalMinutes: true,
  bufferMinutes: true,
  minNoticeMinutes: true,
  bookingHorizonDays: true,
  phone: true,
  email: true,
  country: true,
  stripeAccountId: true,
  stripeAccountLive: true,
  stripeChargesEnabled: true,
} satisfies Prisma.UserSelect;

type ProviderRow = Prisma.UserGetPayload<{ select: typeof providerSelect }>;

export function toProviderDTO(p: ProviderRow): ProviderDTO | null {
  if (!p.slug || !p.businessName || !p.category) return null;
  return {
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    ownerName: p.name,
    category: p.category,
    timezone: p.timezone,
    currency: p.currency,
    locationMode: p.locationMode,
    studioAddress: p.studioAddress,
    serviceAreas: p.serviceAreas,
    serviceAreaCodes: p.serviceAreaCodes,
    depositPercent: p.depositPercent,
    depositLinkUrl: p.depositLinkUrl,
    cancelNoticeHours: p.cancelNoticeHours,
    slotIntervalMinutes: p.slotIntervalMinutes,
    bufferMinutes: p.bufferMinutes,
    minNoticeMinutes: p.minNoticeMinutes,
    bookingHorizonDays: p.bookingHorizonDays,
    phone: p.phone,
    country: p.country,
    takesDeposits: canTakeDeposits(p),
    depositMode: canTakeDeposits(p) ? "card" : p.depositLinkUrl ? "link" : "none",
    stripeConnected: accountUsable(p),
  };
}

/**
 * Prisma `where` fragment for bookings that currently occupy calendar time:
 * confirmed/paid bookings and PENDING holds younger than HOLD_MINUTES.
 */
export function activeBookingWhere(now = new Date()): Prisma.BookingWhereInput {
  const holdCutoff = new Date(now.getTime() - HOLD_MINUTES * 60_000);
  return {
    OR: [
      { status: { in: [BookingStatus.CONFIRMED, BookingStatus.PAID] } },
      { status: BookingStatus.PENDING, createdAt: { gte: holdCutoff } },
    ],
  };
}

/**
 * Release PENDING holds that were never paid. Cancels their PaymentIntents so a
 * late confirmation cannot charge the customer for a slot that was re-sold.
 * Called lazily from slot lookups and dashboard reads, so no cron is required.
 */
export async function expireStaleHolds(providerId: string, now = new Date()): Promise<void> {
  const holdCutoff = new Date(now.getTime() - HOLD_MINUTES * 60_000);
  const stale = await prisma.booking.findMany({
    where: { providerId, status: BookingStatus.PENDING, createdAt: { lt: holdCutoff } },
    include: bookingInclude,
  });
  if (stale.length === 0) return;

  const stripe = safeStripe();
  for (const booking of stale) {
    if (booking.paymentIntentId && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(booking.paymentIntentId);
        if (pi.status === "succeeded") {
          // Race: the customer paid just as the hold expired. Honour the payment.
          const paid = await prisma.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.PAID, paidAt: new Date() },
            include: bookingInclude,
          });
          await publish({ type: "booking.updated", providerId, booking: toBookingDTO(paid) });
          continue;
        }
        if (pi.status !== "canceled") await stripe.paymentIntents.cancel(pi.id);
      } catch (err) {
        console.error(`[holds] could not cancel PaymentIntent for booking ${booking.id}`, err);
      }
    }
    const updated = await prisma.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.PENDING },
      data: { status: BookingStatus.CANCELLED },
    });
    if (updated.count === 1) {
      await publish({
        type: "booking.updated",
        providerId,
        booking: toBookingDTO({ ...booking, status: BookingStatus.CANCELLED, updatedAt: new Date() }),
      });
    }
  }
}

function safeStripe() {
  try {
    return getStripe();
  } catch {
    return null;
  }
}
