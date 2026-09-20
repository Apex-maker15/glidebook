import { NextResponse } from "next/server";
import { subDays } from "date-fns";
import { BookingStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview - everything the owner needs on one screen:
 * platform totals, every provider with their activity, and the latest
 * bookings across the whole platform.
 */
export const GET = handle(async () => {
  await requireAdmin();
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const monthAgo = subDays(now, 30);

  const [providers, recentBookings, paidAll, paidMonth, setupPaid, setupPending, bookingsWeek, bookingsTotal, customers] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.PROVIDER },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        slug: true,
        category: true,
        currency: true,
        country: true,
        locationMode: true,
        depositPercent: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        createdAt: true,
        _count: { select: { services: true, availability: true, providerBookings: true } },
        providerBookings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, status: true },
        },
      },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        amountCents: true,
        depositCents: true,
        platformFeeCents: true,
        currency: true,
        createdAt: true,
        cancelledBy: true,
        customer: { select: { name: true, email: true } },
        service: { select: { name: true } },
        provider: { select: { id: true, businessName: true, slug: true, timezone: true } },
      },
    }),
    // Money is grouped by currency: a GBP nail tech and a USD detailer must never be summed together.
    prisma.booking.groupBy({ by: ["currency"], where: { status: BookingStatus.PAID }, _sum: { depositCents: true, platformFeeCents: true }, _count: { _all: true } }),
    prisma.booking.groupBy({
      by: ["currency"],
      where: { status: BookingStatus.PAID, paidAt: { gte: monthAgo } },
      _sum: { depositCents: true, platformFeeCents: true },
      _count: { _all: true },
    }),
    prisma.setupRequest.aggregate({ where: { status: { in: ["PAID", "DONE"] } }, _sum: { feeCents: true }, _count: { _all: true } }),
    prisma.setupRequest.count({ where: { status: "PAID" } }),
    prisma.booking.count({ where: { createdAt: { gte: weekAgo }, status: { not: BookingStatus.CANCELLED } } }),
    prisma.booking.count({ where: { status: { not: BookingStatus.CANCELLED } } }),
    prisma.user.count({ where: { role: Role.CUSTOMER } }),
  ]);

  // Per-provider money: one grouped query instead of N aggregates.
  const perProvider = await prisma.booking.groupBy({
    by: ["providerId"],
    where: { status: BookingStatus.PAID },
    _sum: { depositCents: true, platformFeeCents: true },
    _count: { _all: true },
  });
  const money = new Map(perProvider.map((r) => [r.providerId, r]));

  return NextResponse.json(
    {
      stripeConfigured: isStripeConfigured(),
      stats: {
        providers: providers.length,
        providersConnected: providers.filter((p) => p.stripeChargesEnabled).length,
        providersLive: providers.filter((p) => p._count.services > 0 && p._count.availability > 0).length,
        customers,
        bookingsTotal,
        bookingsWeek,
        paidBookings: paidAll.reduce((n, r) => n + r._count._all, 0),
        byCurrency: [...new Set([...paidAll, ...paidMonth].map((r) => r.currency))].sort().map((currency) => {
          const all = paidAll.find((r) => r.currency === currency);
          const month = paidMonth.find((r) => r.currency === currency);
          return {
            currency,
            depositsAllCents: all?._sum.depositCents ?? 0,
            depositsMonthCents: month?._sum.depositCents ?? 0,
            feeAllCents: all?._sum.platformFeeCents ?? 0,
            feeMonthCents: month?._sum.platformFeeCents ?? 0,
          };
        }),
        setupRevenueCents: setupPaid._sum.feeCents ?? 0,
        setupsPaid: setupPaid._count._all,
        setupsPending: setupPending,
      },
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        businessName: p.businessName,
        slug: p.slug,
        category: p.category,
        currency: p.currency,
        country: p.country,
        locationMode: p.locationMode,
        depositPercent: p.depositPercent,
        stripe: p.stripeChargesEnabled ? "connected" : p.stripeAccountId ? "incomplete" : "none",
        payoutsEnabled: p.stripePayoutsEnabled,
        services: p._count.services,
        daysSet: p._count.availability,
        bookings: p._count.providerBookings,
        paidBookings: money.get(p.id)?._count._all ?? 0,
        depositsCents: money.get(p.id)?._sum.depositCents ?? 0,
        feeCents: money.get(p.id)?._sum.platformFeeCents ?? 0,
        lastBookingAt: p.providerBookings[0]?.createdAt.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      bookings: recentBookings.map((b) => ({
        id: b.id,
        status: b.status,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        amountCents: b.amountCents,
        depositCents: b.depositCents,
        platformFeeCents: b.platformFeeCents,
        currency: b.currency,
        createdAt: b.createdAt.toISOString(),
        cancelledBy: b.cancelledBy,
        customer: b.customer,
        service: b.service.name,
        provider: b.provider,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
