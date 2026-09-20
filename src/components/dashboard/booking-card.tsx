"use client";

import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { Check, Clock, Mail, MapPin, Phone, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/primitives";
import { spring } from "@/components/motion";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn, formatMoney, initials } from "@/lib/utils";
import type { BookingDTO } from "@/types";

interface Props {
  booking: BookingDTO;
  timezone: string;
  highlighted: boolean;
  compact?: boolean;
}

export const BookingCard = forwardRef<HTMLDivElement, Props>(function BookingCard({ booking, timezone, highlighted, compact }, ref) {
  const updateStatus = useDashboardStore((s) => s.updateStatus);
  const pending = useDashboardStore((s) => Boolean(s.pending[booking.id]));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const isPast = end.getTime() < Date.now();
  const canConfirm = booking.status === "PENDING";
  const awaitingLinkDeposit = booking.status === "CONFIRMED" && Boolean(booking.depositLink) && booking.depositCents > 0;
  const canCancel = booking.status !== "CANCELLED" && !isPast;

  return (
    <>
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: -18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
        transition={spring.soft}
        className={cn("relative rounded-2xl", pending && "opacity-70")}
      >
        {highlighted && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl"
            initial={{ opacity: 1, boxShadow: "0 0 0 2px rgba(139,124,255,0.9), 0 0 40px 4px rgba(139,124,255,0.45)" }}
            animate={{ opacity: 0, boxShadow: "0 0 0 2px rgba(139,124,255,0), 0 0 0px 0px rgba(139,124,255,0)" }}
            transition={{ duration: 3.2, ease: "easeOut" }}
          />
        )}
        <motion.div
          layout
          className={cn(
            "glass relative overflow-hidden rounded-2xl p-4 transition-colors",
            highlighted && "bg-[rgba(139,124,255,0.10)]",
            booking.status === "CANCELLED" && "opacity-60",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[13px] font-semibold text-ink-muted">
              {initials(booking.customer.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold leading-tight">{booking.customer.name}</p>
                <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatMoney(booking.amountCents, booking.currency)}
                  {booking.depositCents < booking.amountCents && (
                    <span className="block text-[11px] font-medium text-ink-muted">
                      {booking.depositCents > 0
                        ? `${formatMoney(booking.depositCents, booking.currency)} deposit${awaitingLinkDeposit ? " · awaiting" : booking.depositLink ? " · via link" : ""}`
                        : "pay on the day"}
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-ink-muted">{booking.service.name}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[13px]">
            <Clock className="size-3.5 shrink-0 text-ink-muted" />
            <span className="truncate font-medium tabular-nums">
              {formatInTimeZone(start, timezone, compact ? "h:mm a" : "EEE, MMM d · h:mm a")}
              <span className="text-ink-muted"> - {formatInTimeZone(end, timezone, "h:mm a")}</span>
            </span>
          </div>
          <div className="mt-2">
            <StatusBadge status={booking.status} />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex w-full items-start gap-2 text-left text-[13px] text-ink-muted transition-colors hover:text-ink"
          >
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className={cn(!expanded && "truncate")}>{[booking.address, booking.postcode].filter(Boolean).join(", ") || "No address given"}</span>
          </button>

          <motion.div
            initial={false}
            animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
            transition={{ ...spring.soft, opacity: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 border-t border-white/[0.08] pt-3 text-[13px] text-ink-muted">
              {booking.serviceDetails && (
                <p className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 size-3.5 shrink-0" /> {booking.serviceDetails}
                </p>
              )}
              {booking.notes && <p className="pl-[22px] text-ink-muted/90">{booking.notes}</p>}
              <p className="flex items-center gap-2">
                <Mail className="size-3.5" />
                <a href={`mailto:${booking.customer.email}`} className="hover:text-ink">
                  {booking.customer.email}
                </a>
              </p>
              {booking.customer.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5" />
                  <a href={`tel:${booking.customer.phone}`} className="hover:text-ink">
                    {booking.customer.phone}
                  </a>
                </p>
              )}
              <p className="pt-1 font-mono text-[11px] text-ink-muted/60">#{booking.id.slice(-8).toUpperCase()}</p>
            </div>
          </motion.div>

          {(canConfirm || canCancel) && (
            <div className="mt-3 flex gap-2">
              {canConfirm && (
                <Button size="sm" className="flex-1" disabled={pending} onClick={() => void updateStatus(booking.id, "CONFIRMED")}>
                  <Check className="size-3.5" /> Confirm
                </Button>
              )}
              {awaitingLinkDeposit && !isPast && (
                <Button size="sm" className="flex-1" disabled={pending} onClick={() => void updateStatus(booking.id, "PAID")}>
                  <Check className="size-3.5" /> Deposit received
                </Button>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant={canConfirm || awaitingLinkDeposit ? "ghost" : "danger"}
                  className={cn(!canConfirm && !awaitingLinkDeposit && "flex-1")}
                  disabled={pending}
                  onClick={() => (booking.status === "PAID" && !booking.depositLink ? setConfirmCancel(true) : void updateStatus(booking.id, "CANCELLED"))}
                >
                  <X className="size-3.5" /> Cancel
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel and refund?"
        description={`${booking.customer.name} paid ${formatMoney(booking.depositCents, booking.currency)}. Cancelling refunds it to their card.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            Keep booking
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmCancel(false);
              void updateStatus(booking.id, "CANCELLED");
            }}
          >
            Cancel & refund
          </Button>
        </div>
      </Modal>
    </>
  );
});
