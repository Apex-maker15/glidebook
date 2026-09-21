/**
 * Business insights engine.
 *
 * Pure, like the slot engine: the caller loads rows from the database and this
 * module turns them into the numbers a provider actually runs their business
 * on — what they earned, what is still to come, which services and clients pay
 * for their week, and how much of their open time is actually sold.
 *
 * Two rules hold everywhere in here:
 *  - A booking "counts" only when it is CONFIRMED or PAID. A PENDING row is an
 *    unpaid hold that `expireStaleHolds` will cancel; counting it would inflate
 *    every figure on the page.
 *  - Periods are whole calendar days in the provider's timezone, so "last 30
 *    days" means the 30 dates ending today wherever they happen to live.
 */
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { BookingStatus } from "@prisma/client";
import { dateInZone, dayOfWeekFor, zonedTime } from "@/lib/slots";
import type { AvailabilitySlots, BusinessInsights, TimeWindow } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTE = 60_000;

/** Ranges the dashboard offers. */
export const RANGE_DAYS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export function parseRange(value: string | null): RangeDays {
  const n = Number(value);
  return (RANGE_DAYS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

export interface InsightsBooking {
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  status: BookingStatus;
  amountCents: number;
  depositCents: number;
  platformFeeCents: number;
  cancelledBy: string | null;
}

export interface InsightsInput {
  timezone: string;
  currency: string;
  days: number;
  /** Weekday (0 = Sunday) → the provider's working windows, for the utilisation denominator. */
  availability: Map<number, AvailabilitySlots | null>;
  /** Every client's first kept booking with this provider, so "new" means new to the business. */
  firstBookingByCustomer: Map<string, Date>;
  /** Bookings from the start of the previous period onwards (kept, cancelled and holds alike). */
  bookings: InsightsBooking[];
  now?: Date;
}

const kept = (b: InsightsBooking) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PAID;

/** Calendar dates from `start` to `end` inclusive. Noon-UTC anchors keep DST out of the arithmetic. */
function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const last = new Date(`${end}T12:00:00Z`);
  for (let cursor = new Date(`${start}T12:00:00Z`); cursor <= last; cursor = addDays(cursor, 1)) {
    out.push(cursor.toISOString().slice(0, 10));
  }
  return out;
}

function shiftDate(date: string, days: number): string {
  return addDays(new Date(`${date}T12:00:00Z`), days).toISOString().slice(0, 10);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / MINUTE);
}

function toIntervals(date: string, windows: TimeWindow[], timezone: string) {
  return windows.map((w) => ({ start: zonedTime(date, w.start, timezone), end: zonedTime(date, w.end, timezone) }));
}

/**
 * Minutes the provider was open on one date, breaks removed and clipped to
 * `until` so today counts only the hours that have already passed. Real
 * instants (not clock arithmetic) so a DST day is 23 or 25 hours long.
 */
function openMinutesOn(date: string, slots: AvailabilitySlots | null, timezone: string, until: Date): number {
  if (!slots || slots.windows.length === 0) return 0;
  const breaks = toIntervals(date, slots.breaks, timezone);
  let total = 0;
  for (const window of toIntervals(date, slots.windows, timezone)) {
    const end = window.end < until ? window.end : until;
    if (end <= window.start) continue;
    total += minutesBetween(window.start, end);
    for (const b of breaks) {
      const overlapStart = b.start > window.start ? b.start : window.start;
      const overlapEnd = b.end < end ? b.end : end;
      total -= minutesBetween(overlapStart, overlapEnd);
    }
  }
  return Math.max(0, Math.round(total));
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 1000 : null;
}

function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}

export function computeInsights(input: InsightsInput): BusinessInsights {
  const { timezone, currency, days, availability, firstBookingByCustomer, bookings } = input;
  const now = input.now ?? new Date();

  const today = dateInZone(now, timezone);
  const startDate = shiftDate(today, -(days - 1));
  const previousStartDate = shiftDate(startDate, -days);
  const rangeStart = zonedTime(startDate, "00:00", timezone);
  const previousStart = zonedTime(previousStartDate, "00:00", timezone);

  const inRange = (b: InsightsBooking) => b.startTime >= rangeStart && b.startTime <= now;
  const current = bookings.filter(inRange);
  const previous = bookings.filter((b) => b.startTime >= previousStart && b.startTime < rangeStart);
  const upcoming = bookings.filter((b) => b.startTime > now && kept(b)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const done = current.filter(kept);
  const cancelled = current.filter((b) => b.status === BookingStatus.CANCELLED);
  const previousDone = previous.filter(kept);

  const earnedCents = done.reduce((n, b) => n + b.amountCents, 0);
  // What actually reached the provider: the deposit Stripe moved, less our fee.
  const collectedCents = done.filter((b) => b.status === BookingStatus.PAID).reduce((n, b) => n + b.depositCents - b.platformFeeCents, 0);
  const dueOnTheDayCents = done.reduce((n, b) => n + Math.max(0, b.amountCents - b.depositCents), 0);

  /* ── Clients ──────────────────────────────────────────────────────────── */

  interface ClientTally {
    id: string;
    name: string;
    appointments: number;
    earnedCents: number;
    lastAt: Date;
    returning: boolean;
  }
  const clientTally = new Map<string, ClientTally>();
  for (const b of done) {
    const first = firstBookingByCustomer.get(b.customerId);
    const entry = clientTally.get(b.customerId) ?? {
      id: b.customerId,
      name: b.customerName,
      appointments: 0,
      earnedCents: 0,
      lastAt: b.startTime,
      // Returning = they had already been here before this period started.
      returning: Boolean(first && first < rangeStart),
    };
    entry.appointments += 1;
    entry.earnedCents += b.amountCents;
    if (b.startTime > entry.lastAt) entry.lastAt = b.startTime;
    clientTally.set(b.customerId, entry);
  }
  const clients = [...clientTally.values()].sort((a, b) => b.earnedCents - a.earnedCents || b.appointments - a.appointments);
  const returningClients = clients.filter((c) => c.returning).length;

  /* ── Services ─────────────────────────────────────────────────────────── */

  const serviceTally = new Map<string, { id: string; name: string; appointments: number; earnedCents: number }>();
  for (const b of done) {
    const entry = serviceTally.get(b.serviceId) ?? { id: b.serviceId, name: b.serviceName, appointments: 0, earnedCents: 0 };
    entry.appointments += 1;
    entry.earnedCents += b.amountCents;
    serviceTally.set(b.serviceId, entry);
  }
  const services = [...serviceTally.values()]
    .sort((a, b) => b.earnedCents - a.earnedCents || b.appointments - a.appointments)
    .map((s) => ({
      ...s,
      share: ratio(s.earnedCents, earnedCents) ?? 0,
      averageCents: Math.round(s.earnedCents / s.appointments),
    }));

  /* ── Open time vs sold time ───────────────────────────────────────────── */

  const dates = eachDate(startDate, today);
  const openByDate = new Map(dates.map((date) => [date, openMinutesOn(date, availability.get(dayOfWeekFor(date)) ?? null, timezone, now)]));
  const openMinutes = [...openByDate.values()].reduce((n, m) => n + m, 0);
  const bookedMinutes = Math.round(done.reduce((n, b) => n + minutesBetween(b.startTime, b.endTime), 0));

  /* ── Rhythm: which days and which hours sell ──────────────────────────── */

  const weekdays = DAY_LABELS.map((label, day) => ({ day, label, appointments: 0, earnedCents: 0, openMinutes: 0 }));
  for (const [date, minutes] of openByDate) weekdays[dayOfWeekFor(date)].openMinutes += minutes;
  const hourCounts = new Map<number, number>();
  for (const b of done) {
    const day = Number(formatInTimeZone(b.startTime, timezone, "i")) % 7; // date-fns "i" is 1 = Monday … 7 = Sunday
    weekdays[day].appointments += 1;
    weekdays[day].earnedCents += b.amountCents;
    const hour = Number(formatInTimeZone(b.startTime, timezone, "H"));
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  // Show the provider's working day, widened to cover anything booked outside it.
  const openHours: number[] = [];
  for (const slots of availability.values()) {
    for (const w of slots?.windows ?? []) {
      const [endHour, endMinute] = w.end.split(":").map(Number);
      // A 09:00-17:00 day is worked in the hours 9 through 16; 09:00-17:30 reaches into 17.
      openHours.push(Number(w.start.slice(0, 2)), endMinute > 0 ? endHour : endHour - 1);
    }
  }
  const hourBounds = [...openHours, ...hourCounts.keys()].filter((h) => Number.isFinite(h));
  const firstHour = hourBounds.length ? Math.max(0, Math.min(...hourBounds)) : 8;
  const lastHour = hourBounds.length ? Math.min(23, Math.max(...hourBounds)) : 20;
  const hours = [];
  for (let hour = firstHour; hour <= lastHour; hour++) {
    hours.push({ hour, label: hourLabel(hour), appointments: hourCounts.get(hour) ?? 0 });
  }

  /* ── Trend: daily bars for short ranges, weekly once they would crowd ─── */

  const weekly = dates.length > 31;
  const bucketSize = weekly ? 7 : 1;
  const trend = [];
  for (let i = 0; i < dates.length; i += bucketSize) {
    const slice = dates.slice(i, i + bucketSize);
    const start = slice[0];
    const end = slice[slice.length - 1];
    const bucketStart = zonedTime(start, "00:00", timezone);
    const bucketEnd = addDays(zonedTime(end, "00:00", timezone), 1);
    const rows = done.filter((b) => b.startTime >= bucketStart && b.startTime < bucketEnd);
    trend.push({
      start,
      label: formatInTimeZone(new Date(`${start}T12:00:00Z`), "UTC", "d MMM"),
      earnedCents: rows.reduce((n, b) => n + b.amountCents, 0),
      appointments: rows.length,
    });
  }

  /* ── Pipeline ─────────────────────────────────────────────────────────── */

  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * MINUTE);
  const nextWeek = upcoming.filter((b) => b.startTime <= weekOut);
  const leadTimes = done.map((b) => (b.startTime.getTime() - b.createdAt.getTime()) / (24 * 60 * MINUTE)).filter((d) => d >= 0);

  return {
    range: { days, start: startDate, end: today, previousStart: previousStartDate, weekly },
    currency,
    timezone,
    totals: {
      earnedCents,
      collectedCents,
      dueOnTheDayCents,
      appointments: done.length,
      clients: clients.length,
      newClients: clients.length - returningClients,
      returningClients,
      repeatRate: ratio(returningClients, clients.length),
      averageTicketCents: done.length > 0 ? Math.round(earnedCents / done.length) : 0,
      cancelled: cancelled.length,
      cancelledByClient: cancelled.filter((b) => b.cancelledBy === "client").length,
      cancellationRate: ratio(cancelled.length, done.length + cancelled.length),
      leadTimeDays: leadTimes.length > 0 ? Math.round((leadTimes.reduce((n, d) => n + d, 0) / leadTimes.length) * 10) / 10 : null,
    },
    previous: {
      earnedCents: previousDone.reduce((n, b) => n + b.amountCents, 0),
      appointments: previousDone.length,
      clients: new Set(previousDone.map((b) => b.customerId)).size,
    },
    upcoming: {
      appointments: upcoming.length,
      valueCents: upcoming.reduce((n, b) => n + b.amountCents, 0),
      dueCents: upcoming.reduce((n, b) => n + Math.max(0, b.amountCents - b.depositCents), 0),
      nextAt: upcoming[0]?.startTime.toISOString() ?? null,
      week: nextWeek.length,
      weekValueCents: nextWeek.reduce((n, b) => n + b.amountCents, 0),
    },
    utilisation: { bookedMinutes, openMinutes, rate: ratio(bookedMinutes, openMinutes) },
    trend,
    services,
    clients: clients.slice(0, 6).map((c) => ({ ...c, lastAt: c.lastAt.toISOString() })),
    weekdays,
    hours,
  };
}
