"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, CreditCard, Clock, MapPin, Phone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/primitives";
import { spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import type { BookingStatus } from "@/types";

export interface ManageBookingProps {
  booking: {
    id: string;
    token: string;
    status: BookingStatus;
    clientName: string;
    businessName: string;
    providerSlug: string | null;
    providerPhone: string | null;
    serviceName: string;
    durationMinutes: number;
    dateLabel: string;
    timeLabel: string;
    timezone: string;
    location: string | null;
    totalLabel: string;
    /** Null when nothing was paid online (provider collects on the day). */
    paidLabel: string | null;
    /** Provider's payment link while the deposit is still due. */
    depositLink: string | null;
    /** Deposit is handled outside GlideBook, so refunds are between client and provider. */
    manualDeposit: boolean;
    balanceLabel: string | null;
    cancelNoticeHours: number;
    refundable: boolean;
    isPast: boolean;
    startIso: string;
    endIso: string;
  };
}

export function ManageBooking({ booking: b }: ManageBookingProps) {
  const [status, setStatus] = useState<BookingStatus>(b.status);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ refunded: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ status: BookingStatus; refunded: boolean }>(`/api/bookings/${b.id}/cancel`, {
        method: "POST",
        body: { token: b.token },
      });
      setStatus(r.status);
      setResult({ refunded: r.refunded });
      setConfirm(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const googleCalendarUrl = (() => {
    const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${b.serviceName} with ${b.businessName}`,
      dates: `${fmt(b.startIso)}/${fmt(b.endIso)}`,
      location: b.location ?? "",
      details: `Manage your booking: ${typeof window !== "undefined" ? window.location.href : ""}`,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  })();

  const cancelled = status === "CANCELLED";
  const first = b.clientName.split(" ")[0];

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="glass rounded-3xl p-6 sm:p-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{b.businessName}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {cancelled ? `This booking is cancelled, ${first}.` : b.isPast ? `Thanks for visiting, ${first}.` : `Hi ${first}, here's your booking.`}
      </h1>
      <div className="mt-3">
        <StatusBadge status={status} />
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-ink-muted">
              {result.refunded
                ? `Your ${b.paidLabel} payment is being refunded to your card. It usually shows within 5-10 working days.`
                : b.manualDeposit && b.paidLabel
                  ? `Cancelled. ${b.businessName} handles your ${b.paidLabel} deposit directly - contact them about a refund.`
                  : b.paidLabel
                    ? `Cancelled. As this was within ${b.cancelNoticeHours} hours of the appointment, the ${b.paidLabel} deposit is not refunded.`
                    : "Cancelled. Nothing was paid online, so there is nothing to refund."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm">
        <p className="text-base font-semibold">{b.serviceName}</p>
        <p className="flex items-center gap-2 text-ink-muted">
          <Clock className="size-4 shrink-0" /> {b.dateLabel} · {b.timeLabel} ({b.timezone.replace(/_/g, " ")})
        </p>
        {b.location && (
          <p className="flex items-start gap-2 text-ink-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" /> {b.location}
          </p>
        )}
        {b.providerPhone && (
          <p className="flex items-center gap-2 text-ink-muted">
            <Phone className="size-4 shrink-0" />
            <a href={`tel:${b.providerPhone}`} className="hover:text-ink">
              {b.providerPhone}
            </a>
          </p>
        )}
        <p className="border-t border-white/[0.08] pt-3 text-ink-muted">
          {b.paidLabel ? (
            <>
              Paid <span className="font-semibold text-ink">{b.paidLabel}</span>
              {b.balanceLabel && (
                <>
                  {" "}
                  · <span className="font-semibold text-ink">{b.balanceLabel}</span> due on the day
                </>
              )}{" "}
              · total {b.totalLabel}
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">{b.totalLabel}</span> to pay on the day
            </>
          )}
        </p>
      </div>

      {!cancelled && !b.isPast && (
        <div className="mt-6 flex flex-wrap gap-2">
          {b.depositLink && (
            <a href={b.depositLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-semibold text-black shadow-glow">
              <CreditCard className="size-4" /> Pay {b.paidLabel} deposit
            </a>
          )}
          <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/[0.08] px-4 text-sm font-medium transition-colors hover:bg-white/[0.12]">
            <CalendarPlus className="size-4" /> Add to Google Calendar
          </a>
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            <XCircle className="size-4" /> Cancel booking
          </Button>
        </div>
      )}

      {(cancelled || b.isPast) && b.providerSlug && (
        <div className="mt-6">
          <Link href={`/book/${b.providerSlug}`} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-semibold text-black">
            Book again
          </Link>
        </div>
      )}

      <p className="mt-6 text-[12px] text-ink-muted">
        {b.paidLabel
          ? `Cancellation policy: cancel more than ${b.cancelNoticeHours} hours before your appointment for an automatic refund. Later than that, the deposit is kept.`
          : `Please cancel at least ${b.cancelNoticeHours} hours before your appointment so the slot can go to someone else.`}
      </p>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Cancel this booking?"
        description={
          !b.paidLabel
            ? "The slot will be released straight away and the provider will be told."
            : b.manualDeposit
              ? `The slot will be released and ${b.businessName} will be told. Any deposit refund is arranged with them directly.`
              : b.refundable
              ? `You're outside the ${b.cancelNoticeHours}-hour window, so your ${b.paidLabel} payment will be refunded automatically.`
              : `This is within ${b.cancelNoticeHours} hours of the appointment, so the ${b.paidLabel} deposit will not be refunded.`
        }
      >
        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={() => void cancel()} loading={busy}>
            Cancel booking
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
