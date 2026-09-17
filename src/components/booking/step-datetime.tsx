"use client";

import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Globe } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useBookingStore } from "@/store/booking-store";
import { useProvider } from "./provider-context";
import { Calendar } from "./calendar";
import { TimeSlots } from "./time-slots";

export function StepDateTime() {
  const provider = useProvider();
  const date = useBookingStore((s) => s.date);
  const slot = useBookingStore((s) => s.slot);
  const slots = useBookingStore((s) => s.slots);
  const slotsStatus = useBookingStore((s) => s.slotsStatus);
  const slotsError = useBookingStore((s) => s.slotsError);
  const monthAvailability = useBookingStore((s) => s.monthAvailability);
  const monthStatus = useBookingStore((s) => s.monthStatus);
  const setDate = useBookingStore((s) => s.setDate);
  const selectSlot = useBookingStore((s) => s.selectSlot);
  const loadSlots = useBookingStore((s) => s.loadSlots);
  const loadMonth = useBookingStore((s) => s.loadMonth);
  const next = useBookingStore((s) => s.next);
  const back = useBookingStore((s) => s.back);

  const { min, max } = useMemo(() => {
    const now = new Date();
    const earliest = new Date(now.getTime() + provider.minNoticeMinutes * 60_000);
    return {
      min: formatInTimeZone(earliest, provider.timezone, "yyyy-MM-dd"),
      max: formatInTimeZone(addDays(now, provider.bookingHorizonDays), provider.timezone, "yyyy-MM-dd"),
    };
  }, [provider]);

  const initialMonth = (date ?? min).slice(0, 7);
  useEffect(() => {
    void loadMonth(initialMonth);
  }, [initialMonth, loadMonth]);

  // Re-fetch slots when returning to this step after a stale state (e.g. slot taken).
  useEffect(() => {
    if (date && slotsStatus === "idle") void loadSlots(date);
  }, [date, slotsStatus, loadSlots]);

  const availability = useMemo(() => {
    const merged: Record<string, boolean | undefined> = {};
    for (const days of Object.values(monthAvailability)) Object.assign(merged, days);
    return merged;
  }, [monthAvailability]);

  const currentMonth = date ? date.slice(0, 7) : initialMonth;

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Pick a date & time</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <Globe className="size-3.5" /> Times shown in {provider.timezone.replace(/_/g, " ")}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4">
          <Calendar
            value={date}
            onChange={setDate}
            min={min}
            max={max}
            availability={availability}
            onMonthChange={(m) => void loadMonth(m)}
            loadingMonth={monthStatus[currentMonth] === "loading"}
          />
        </div>
        <div>
          <TimeSlots
            slots={slots}
            status={slotsStatus}
            error={slotsError}
            selected={slot}
            onSelect={selectSlot}
            onRetry={() => date && void loadSlots(date)}
            hasDate={Boolean(date)}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button size="lg" disabled={!slot} onClick={next}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
