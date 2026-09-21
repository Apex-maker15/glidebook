import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { providerScope } from "@/lib/admin";
import { handle, HttpError } from "@/lib/api";
import { expireStaleHolds } from "@/lib/bookings";
import { computeInsights, parseRange } from "@/lib/insights";
import { dateInZone, parseAvailability, zonedTime } from "@/lib/slots";
import type { AvailabilitySlots } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/business?range=30 - how the provider's business is doing.
 *
 * One pass over their bookings feeds every cut on the page, so the whole
 * screen costs three queries no matter how many panels it grows.
 */
export const GET = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  const days = parseRange(new URL(req.url).searchParams.get("range"));

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { timezone: true, currency: true },
  });
  if (!provider) throw new HttpError(404, "Provider not found", "NOT_FOUND");

  // Expired holds would otherwise sit in the window looking like real work.
  await expireStaleHolds(providerId);

  const now = new Date();
  const kept = [BookingStatus.CONFIRMED, BookingStatus.PAID];
  // Reach back two periods so the page can show the change on the one before.
  const from = zonedTime(dateInZone(addDays(now, -(days * 2 - 1)), provider.timezone), "00:00", provider.timezone);

  const [bookings, availability, firstBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { providerId, startTime: { gte: from } },
      orderBy: { startTime: "asc" },
      select: {
        customerId: true,
        serviceId: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        status: true,
        amountCents: true,
        depositCents: true,
        platformFeeCents: true,
        cancelledBy: true,
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.availability.findMany({ where: { providerId }, select: { dayOfWeek: true, slots: true } }),
    // All time, not just the window: a client who last came a year ago is still a regular.
    prisma.booking.groupBy({
      by: ["customerId"],
      where: { providerId, status: { in: kept } },
      _min: { startTime: true },
    }),
  ]);

  const insights = computeInsights({
    timezone: provider.timezone,
    currency: provider.currency,
    days,
    availability: new Map<number, AvailabilitySlots | null>(availability.map((a) => [a.dayOfWeek, parseAvailability(a.slots)])),
    firstBookingByCustomer: new Map(firstBookings.flatMap((r) => (r._min.startTime ? [[r.customerId, r._min.startTime] as const] : []))),
    bookings: bookings.map((b) => ({
      customerId: b.customerId,
      customerName: b.customer.name,
      serviceId: b.serviceId,
      serviceName: b.service.name,
      startTime: b.startTime,
      endTime: b.endTime,
      createdAt: b.createdAt,
      status: b.status,
      amountCents: b.amountCents,
      depositCents: b.depositCents,
      platformFeeCents: b.platformFeeCents,
      cancelledBy: b.cancelledBy,
    })),
    now,
  });

  return NextResponse.json({ insights }, { headers: { "Cache-Control": "no-store" } });
});
