"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarPlus, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spring } from "@/components/motion";
import { useBookingStore, selectService } from "@/store/booking-store";
import { useProvider } from "./provider-context";
import { api } from "@/lib/client-api";
import { formatMoney } from "@/lib/utils";
import type { BookingStatus } from "@/types";

function icsFor(opts: { title: string; start: string; end: string; location: string; description: string }) {
  const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GlideBook//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@glidebook`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(opts.end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `LOCATION:${esc(opts.location)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function StepSuccess() {
  const provider = useProvider();
  const booking = useBookingStore((s) => s.booking);
  const service = useBookingStore(selectService);
  const customer = useBookingStore((s) => s.customer);
  const reset = useBookingStore((s) => s.reset);
  const [serverStatus, setServerStatus] = useState<BookingStatus | null>(null);

  // Reconcile with the webhook-driven status; the UI already shows success optimistically.
  useEffect(() => {
    if (!booking) return;
    let attempts = 0;
    let cancelled = false;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await api<{ booking: { status: BookingStatus } }>(`/api/bookings/${booking.id}`);
        if (cancelled) return;
        setServerStatus(res.booking.status);
        if (res.booking.status === "PAID" || attempts >= 12) return;
      } catch {
        if (cancelled || attempts >= 12) return;
      }
      setTimeout(() => void tick(), 2500);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [booking]);

  if (!booking || !service) return null;

  const when = formatInTimeZone(new Date(booking.startTime), provider.timezone, "EEEE, MMMM d 'at' h:mm a");
  const confirmed = serverStatus === "PAID";

  const downloadIcs = () => {
    const ics = icsFor({
      title: `${service.name} with ${provider.businessName}`,
      start: booking.startTime,
      end: booking.endTime,
      location: provider.locationMode === "MOBILE" ? customer.address : (provider.studioAddress ?? ""),
      description: `Booking ${booking.id}. ${provider.phone ? `Provider phone: ${provider.phone}` : ""}`,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "booking.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.gentle, delay: 0.05 }}
        className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/40 shadow-glow-lg"
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-accent/20"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
        />
        <svg viewBox="0 0 48 48" className="size-12 text-accent-strong" fill="none" aria-hidden>
          <motion.path
            d="M12 25 L21 33 L37 15"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          />
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.2 }}
        className="text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        You&apos;re booked{customer.name ? `, ${customer.name.split(" ")[0]}` : ""}.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.28 }}
        className="mt-2 max-w-md text-sm text-ink-muted"
      >
        {service.name} on <span className="text-ink">{when}</span>.{" "}
        {booking.depositCents < booking.amountCents
          ? `Your ${formatMoney(booking.depositCents, booking.currency)} deposit is confirmed and the remaining ${formatMoney(booking.amountCents - booking.depositCents, booking.currency)} is paid on the day. A receipt is on its way to ${customer.email}.`
          : `A receipt for ${formatMoney(booking.amountCents, booking.currency)} is on its way to ${customer.email}.`}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.36 }}
        className="mt-6 flex w-full max-w-md flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left text-sm"
      >
        <div className="flex items-start gap-2.5 text-ink-muted">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>{provider.locationMode === "MOBILE" ? customer.address : provider.studioAddress ?? "Address shared by the provider"}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px]">
          <motion.span
            layout
            className={`size-2 rounded-full ${confirmed ? "bg-emerald-400" : "bg-amber-300"}`}
            animate={confirmed ? {} : { opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-ink-muted">{confirmed ? "Payment confirmed" : "Finalising payment with your bank"}</span>
          <span className="ml-auto font-mono text-ink-muted/60">#{booking.id.slice(-6).toUpperCase()}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.44 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <Button variant="secondary" onClick={downloadIcs}>
          <CalendarPlus className="size-4" /> Add to calendar
        </Button>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw className="size-4" /> Book another
        </Button>
      </motion.div>
    </div>
  );
}
