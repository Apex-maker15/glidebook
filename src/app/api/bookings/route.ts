import { NextResponse } from "next/server";
import { addDays, subDays } from "date-fns";
import { BookingStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
import { activeBookingWhere, bookingInclude, expireStaleHolds, toBookingDTO } from "@/lib/bookings";
import { dayBounds, dateInZone, isSlotBookable, parseAvailability, dayOfWeekFor, type ScheduleConfig } from "@/lib/slots";
import { publish } from "@/lib/realtime";
import { createBookingSchema } from "@/lib/validation";
import { depositFor } from "@/lib/categories";
import { manageUrlFor } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { canTakeDeposits, platformFeeFor } from "@/lib/payments";
import { notifyBookingConfirmed } from "@/lib/notifications";
import { normalisePostcode, parseAreaCodes, postcodeInArea } from "@/lib/service-area";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/bookings?from&to - the signed-in provider's schedule. */
export const GET = handle(async (req: Request) => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const rangeStart = from ? new Date(from) : subDays(new Date(), 7);
  const rangeEnd = to ? new Date(to) : addDays(new Date(), 90);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new HttpError(400, "from/to must be ISO timestamps", "BAD_RANGE");
  }

  await expireStaleHolds(user.id);

  const rows = await prisma.booking.findMany({
    where: { providerId: user.id, startTime: { gte: rangeStart, lt: rangeEnd } },
    include: bookingInclude,
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json({ bookings: rows.map(toBookingDTO) }, { headers: { "Cache-Control": "no-store" } });
});

/** POST /api/bookings - public: create a PENDING hold after server-side slot validation. */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "bookings", 20, 10 * 60_000);
  const input = createBookingSchema.parse(await readJson(req));
  const start = new Date(input.startTime);
  if (start.getSeconds() !== 0 || start.getMilliseconds() !== 0) {
    throw new HttpError(422, "Start time must be on a whole minute", "BAD_START");
  }
  const now = new Date();

  const provider = await prisma.user.findFirst({
    where: { id: input.providerId, role: Role.PROVIDER },
    select: {
      id: true,
      timezone: true,
      currency: true,
      locationMode: true,
      studioAddress: true,
      serviceAreaCodes: true,
      depositPercent: true,
      depositLinkUrl: true,
      slotIntervalMinutes: true,
      bufferMinutes: true,
      minNoticeMinutes: true,
      bookingHorizonDays: true,
      stripeAccountId: true,
      stripeAccountLive: true,
      stripeChargesEnabled: true,
      availability: { select: { dayOfWeek: true, slots: true } },
    },
  });
  if (!provider) throw new HttpError(404, "Provider not found", "NOT_FOUND");

  // Mobile providers need somewhere to drive to; studio providers already know where the client is going.
  const address = provider.locationMode === "MOBILE" ? (input.address ?? "").trim() : provider.studioAddress;
  if (provider.locationMode === "MOBILE" && (!address || address.length < 5)) {
    throw new HttpError(422, "Please tell us where to come to", "ADDRESS_REQUIRED");
  }
  const areaCodes = provider.locationMode === "MOBILE" ? parseAreaCodes(provider.serviceAreaCodes) : [];
  const postcode = provider.locationMode === "MOBILE" && input.postcode ? normalisePostcode(input.postcode) : null;
  if (areaCodes.length > 0) {
    if (!postcode) throw new HttpError(422, "Please enter your postcode so we can check we cover your area", "POSTCODE_REQUIRED");
    if (!postcodeInArea(postcode, areaCodes)) {
      throw new HttpError(422, "Sorry, that area is outside where we currently travel", "OUT_OF_AREA");
    }
  }

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, providerId: provider.id, active: true },
  });
  if (!service) throw new HttpError(404, "Service not found", "NOT_FOUND");

  const config: ScheduleConfig = {
    timezone: provider.timezone,
    slotIntervalMinutes: provider.slotIntervalMinutes,
    bufferMinutes: provider.bufferMinutes,
    minNoticeMinutes: provider.minNoticeMinutes,
    bookingHorizonDays: provider.bookingHorizonDays,
  };
  const date = dateInZone(start, config.timezone);
  const availability = parseAvailability(provider.availability.find((a) => a.dayOfWeek === dayOfWeekFor(date))?.slots) ?? null;
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);
  const bounds = dayBounds(date, config.timezone, 24 * 60);
  const email = input.customer.email.toLowerCase();

  // Three ways a deposit can work:
  //  card - Stripe is connected: hold the slot, charge on the next step.
  //  link - provider has their own payment link: confirm the slot, send the client to the link, provider marks it paid.
  //  none - nothing online; the provider collects on the day.
  const requiresPayment = canTakeDeposits(provider);
  const viaLink = !requiresPayment && Boolean(provider.depositLinkUrl);
  const depositCents = requiresPayment || viaLink ? depositFor(service.priceCents, provider.depositPercent, provider.currency) : 0;

  const booking = await prisma.$transaction(
    async (tx) => {
      // Serialise all writes for this provider so two customers cannot grab the same slot.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${provider.id}))`;

      const busyRows = await tx.booking.findMany({
        where: { providerId: provider.id, startTime: { lt: bounds.end }, endTime: { gt: bounds.start }, ...activeBookingWhere(now) },
        select: { startTime: true, endTime: true },
      });
      const bookable = isSlotBookable(start, {
        config,
        availability,
        durationMinutes: service.durationMinutes,
        busy: busyRows.map((b) => ({ start: b.startTime, end: b.endTime })),
        now,
      });
      if (!bookable) throw new HttpError(409, "That time is no longer available. Please pick another slot.", "SLOT_UNAVAILABLE");

      const existing = await tx.user.findUnique({ where: { email } });
      const customer = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              phone: input.customer.phone ?? existing.phone,
              ...(existing.role === Role.CUSTOMER ? { name: input.customer.name } : {}),
            },
          })
        : await tx.user.create({
            data: { email, name: input.customer.name, phone: input.customer.phone ?? null, role: Role.CUSTOMER },
          });

      return tx.booking.create({
        data: {
          providerId: provider.id,
          customerId: customer.id,
          serviceId: service.id,
          startTime: start,
          endTime: end,
          status: requiresPayment ? BookingStatus.PENDING : BookingStatus.CONFIRMED,
          amountCents: service.priceCents,
          depositCents,
          platformFeeCents: requiresPayment ? platformFeeFor(depositCents) : 0,
          depositLink: viaLink ? provider.depositLinkUrl : null,
          currency: provider.currency,
          address,
          postcode,
          serviceDetails: input.serviceDetails ?? null,
          notes: input.notes ?? null,
        },
        include: bookingInclude,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 },
  );

  const dto = toBookingDTO(booking);
  await publish({ type: "booking.created", providerId: provider.id, booking: dto });
  if (!requiresPayment) await notifyBookingConfirmed(booking.id);
  return NextResponse.json({ booking: dto, manageUrl: manageUrlFor(booking), requiresPayment }, { status: 201 });
});
