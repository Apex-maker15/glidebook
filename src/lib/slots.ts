/**
 * Time-slot engine.
 *
 * Everything here is pure: the caller loads availability + busy intervals from
 * the database and this module decides which start times are bookable.
 * Instants are UTC `Date`s; wall-clock strings ("09:00") are interpreted in the
 * provider's IANA timezone so DST transitions are handled by date-fns-tz.
 */
import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { AvailabilitySlots, SlotDTO, TimeWindow } from "@/types";
import { availabilitySlotsSchema } from "@/lib/validation";

export interface ScheduleConfig {
  timezone: string;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  bookingHorizonDays: number;
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface ComputeSlotsInput {
  /** Calendar date in the provider's timezone, "YYYY-MM-DD". */
  date: string;
  config: ScheduleConfig;
  availability: AvailabilitySlots | null;
  durationMinutes: number;
  /** Existing bookings (already excluding cancelled / expired holds). */
  busy: Interval[];
  now?: Date;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Day of week (0-6) for a calendar date string, independent of host timezone. */
export function dayOfWeekFor(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Calendar date ("YYYY-MM-DD") of an instant as seen in the provider's timezone. */
export function dateInZone(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}

export function zonedTime(date: string, hhmm: string, timezone: string): Date {
  return fromZonedTime(`${date}T${hhmm}:00`, timezone);
}

export function parseAvailability(json: unknown): AvailabilitySlots | null {
  const parsed = availabilitySlotsSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function windowsToIntervals(date: string, windows: TimeWindow[], timezone: string): Interval[] {
  return windows.map((w) => ({
    start: zonedTime(date, w.start, timezone),
    end: zonedTime(date, w.end, timezone),
  }));
}

/**
 * Enumerate every bookable start time for one calendar day.
 *
 * A candidate start `t` is valid when:
 *  1. `t + duration` fits inside one availability window,
 *  2. it does not intersect an employee break,
 *  3. it respects the buffer around every existing booking,
 *  4. it is at least `minNoticeMinutes` in the future and within the horizon.
 */
export function computeSlots(input: ComputeSlotsInput): Interval[] {
  const { date, config, availability, durationMinutes, busy } = input;
  const now = input.now ?? new Date();

  if (!availability || availability.windows.length === 0) return [];
  if (durationMinutes <= 0 || config.slotIntervalMinutes <= 0) return [];

  const earliest = addMinutes(now, config.minNoticeMinutes);
  const horizonEnd = addMinutes(now, config.bookingHorizonDays * 24 * 60);

  const windows = windowsToIntervals(date, availability.windows, config.timezone);
  const breaks = windowsToIntervals(date, availability.breaks, config.timezone);
  const buffer = config.bufferMinutes;

  const found = new Map<number, Interval>();

  for (const window of windows) {
    let t = window.start;
    while (true) {
      const end = addMinutes(t, durationMinutes);
      if (end > window.end) break;

      const ok =
        t >= earliest &&
        t <= horizonEnd &&
        !breaks.some((b) => overlaps(t, end, b.start, b.end)) &&
        !busy.some((b) => overlaps(t, end, addMinutes(b.start, -buffer), addMinutes(b.end, buffer)));

      if (ok) found.set(t.getTime(), { start: t, end });
      t = addMinutes(t, config.slotIntervalMinutes);
    }
  }

  return [...found.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** True when `start` is exactly one of the slots the engine would offer. */
export function isSlotBookable(start: Date, input: Omit<ComputeSlotsInput, "date">): boolean {
  const date = dateInZone(start, input.config.timezone);
  const slots = computeSlots({ ...input, date });
  const wanted = start.getTime();
  return slots.some((s) => s.start.getTime() === wanted);
}

export function toSlotDTO(slot: Interval, timezone: string): SlotDTO {
  return {
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    label: formatInTimeZone(slot.start, timezone, "h:mm a"),
  };
}

/** UTC bounds of a provider-local calendar day, padded by `paddingMinutes` on each side. */
export function dayBounds(date: string, timezone: string, paddingMinutes = 0): Interval {
  const start = zonedTime(date, "00:00", timezone);
  const end = fromZonedTime(`${date}T23:59:59.999`, timezone);
  return {
    start: addMinutes(start, -paddingMinutes),
    end: addMinutes(end, paddingMinutes),
  };
}
