import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, HttpError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { bookingInclude, expireStaleHolds, toBookingDTO } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/providers/:id - one provider's account details and their whole booking history. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const p = await prisma.user.findFirst({
    where: { id, role: Role.PROVIDER },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      businessName: true,
      slug: true,
      category: true,
      currency: true,
      timezone: true,
      country: true,
      locationMode: true,
      depositPercent: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      createdAt: true,
      _count: { select: { services: true, availability: true } },
    },
  });
  if (!p) throw new HttpError(404, "Provider not found", "NOT_FOUND");

  await expireStaleHolds(p.id);
  const rows = await prisma.booking.findMany({
    where: { providerId: p.id },
    include: bookingInclude,
    orderBy: { startTime: "desc" },
    take: 200,
  });

  return NextResponse.json(
    {
      provider: {
        ...p,
        createdAt: p.createdAt.toISOString(),
        stripe: p.stripeChargesEnabled ? "connected" : p.stripeAccountId ? "incomplete" : "none",
      },
      bookings: rows.map(toBookingDTO),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
