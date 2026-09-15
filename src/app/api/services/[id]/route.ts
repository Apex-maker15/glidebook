import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
import { serviceInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const select = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  currency: true,
  active: true,
  sortOrder: true,
};

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const { id } = await ctx.params;
  const input = serviceInputSchema.partial().parse(await readJson(req));

  const existing = await prisma.service.findFirst({ where: { id, providerId: user.id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Service not found", "NOT_FOUND");

  const service = await prisma.service.update({ where: { id }, data: input, select });
  return NextResponse.json({ service });
});

/** Hard-delete when unused; otherwise deactivate so historical bookings keep their reference. */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const { id } = await ctx.params;

  const existing = await prisma.service.findFirst({
    where: { id, providerId: user.id },
    select: { id: true, _count: { select: { bookings: true } } },
  });
  if (!existing) throw new HttpError(404, "Service not found", "NOT_FOUND");

  const upcoming = await prisma.booking.count({
    where: {
      serviceId: id,
      startTime: { gte: new Date() },
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.PAID] },
    },
  });
  if (upcoming > 0) {
    throw new HttpError(
      409,
      `${upcoming} upcoming booking(s) use this service. Cancel them first or deactivate the service instead.`,
      "IN_USE",
    );
  }

  if (existing._count.bookings === 0) {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }
  const service = await prisma.service.update({ where: { id }, data: { active: false }, select });
  return NextResponse.json({ deleted: false, service });
});
