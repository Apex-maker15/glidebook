import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { handle, HttpError } from "@/lib/api";
import { activeBookingWhere, expireStaleHolds } from "@/lib/bookings";
import {
  computeSlots,
  dayBounds,
  dayOfWeekFor,
  isIsoDate,
  parseAvailability,
  toSlotDTO,
  type ScheduleConfig,
} from "@/lib/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/slots?providerId&serviceId&date=YYYY-MM-DD   → bookable slots for one day
 * GET /api/slots?providerId&serviceId&month=YYYY-MM     → which days in the month have any slot
 */
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId") ?? "";
  const serviceId = url.searchParams.get("serviceId") ?? "";
  const date = url.searchParams.get("date");
  const month = url.searchParams.get("month");

  if (!providerId || !serviceId) throw new HttpError(400, "providerId and serviceId are required", "MISSING_PARAMS");
  if (!date && !month) throw new HttpError(400, "date or month is required", "MISSING_PARAMS");
  if (date && !isIsoDate(date)) throw new HttpError(400, "date must be YYYY-MM-DD", "BAD_DATE");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "month must be YYYY-MM", "BAD_MONTH");

  const [provider, service] = await Promise.all([
    prisma.user.findUnique({
      where: { id: providerId },
      select: {
        timezone: true,
        slotIntervalMinutes: true,
        bufferMinutes: true,
        minNoticeMinutes: true,
        bookingHorizonDays: true,
        availability: { select: { dayOfWeek: true, slots: true } },
      },
    }),
    prisma.service.findFirst({ where: { id: serviceId, providerId, active: true }, select: { durationMinutes: true } }),
  ]);
  if (!provider) throw new HttpError(404, "Provider not found", "NOT_FOUND");
  if (!service) throw new HttpError(404, "Service not found", "NOT_FOUND");

  await expireStaleHolds(providerId);

  const config: ScheduleConfig = {
    timezone: provider.timezone,
    slotIntervalMinutes: provider.slotIntervalMinutes,
    bufferMinutes: provider.bufferMinutes,
    minNoticeMinutes: provider.minNoticeMinutes,
    bookingHorizonDays: provider.bookingHorizonDays,
  };
  const availabilityByDay = new Map(provider.availability.map((a) => [a.dayOfWeek, parseAvailability(a.slots)]));
  const now = new Date();

  if (date) {
    const bounds = dayBounds(date, config.timezone, 24 * 60);
    const busy = await prisma.booking.findMany({
      where: { providerId, startTime: { lt: bounds.end }, endTime: { gt: bounds.start }, ...activeBookingWhere(now) },
      select: { startTime: true, endTime: true },
    });
    const slots = computeSlots({
      date,
      config,
      availability: availabilityByDay.get(dayOfWeekFor(date)) ?? null,
      durationMinutes: service.durationMinutes,
      busy: busy.map((b) => ({ start: b.startTime, end: b.endTime })),
      now,
    });
    return NextResponse.json(
      { date, timezone: config.timezone, slots: slots.map((s) => toSlotDTO(s, config.timezone)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Month overview: one bookings query, then the pure engine per day.
  const firstDay = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(Number(month!.slice(0, 4)), Number(month!.slice(5, 7)), 0)).getUTCDate();
  const from = dayBounds(firstDay, config.timezone, 24 * 60).start;
  const to = addDays(dayBounds(`${month}-${String(daysInMonth).padStart(2, "0")}`, config.timezone, 24 * 60).end, 1);
  const busyAll = await prisma.booking.findMany({
    where: { providerId, startTime: { lt: to }, endTime: { gt: from }, ...activeBookingWhere(now) },
    select: { startTime: true, endTime: true },
  });
  const busy = busyAll.map((b) => ({ start: b.startTime, end: b.endTime }));

  const days: Record<string, boolean> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    const slots = computeSlots({
      date: iso,
      config,
      availability: availabilityByDay.get(dayOfWeekFor(iso)) ?? null,
      durationMinutes: service.durationMinutes,
      busy,
      now,
    });
    days[iso] = slots.length > 0;
  }
  return NextResponse.json({ month, timezone: config.timezone, days }, { headers: { "Cache-Control": "no-store" } });
});
