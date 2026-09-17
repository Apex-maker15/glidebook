"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarDays, Clock, Receipt, Sparkles } from "lucide-react";
import { spring } from "@/components/motion";
import { useBookingStore, selectService } from "@/store/booking-store";
import { formatDuration, formatMoney } from "@/lib/utils";
import { depositFor } from "@/lib/categories";

export function SummaryCard() {
  const provider = useBookingStore((s) => s.provider)!;
  const service = useBookingStore(selectService);
  const slot = useBookingStore((s) => s.slot);
  const step = useBookingStore((s) => s.step);

  const rows = [
    service && {
      key: "service",
      icon: <Sparkles className="size-4" />,
      label: service.name,
      detail: formatDuration(service.durationMinutes),
    },
    slot && {
      key: "slot",
      icon: <CalendarDays className="size-4" />,
      label: formatInTimeZone(new Date(slot.start), provider.timezone, "EEE, MMM d"),
      detail: `${slot.label} - ${formatInTimeZone(new Date(slot.end), provider.timezone, "h:mm a")}`,
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: string; detail: string }[];

  const total = service ? formatMoney(service.priceCents, provider.currency) : null;
  const depositCents = service ? depositFor(service.priceCents, provider.depositPercent, provider.currency) : 0;
  const isDeposit = service ? depositCents < service.priceCents : false;
  const dueToday = service ? formatMoney(depositCents, provider.currency) : null;

  return (
    <>
      {/* Desktop: sticky side panel */}
      <motion.aside layout transition={spring.soft} className="glass hidden rounded-3xl p-5 lg:sticky lg:top-6 lg:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Your booking</p>
        <div className="mt-4 min-h-[88px] space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {rows.length === 0 && (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-ink-muted"
              >
                Select a service to get started.
              </motion.p>
            )}
            {rows.map((r) => (
              <motion.div
                key={r.key}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={spring.soft}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/[0.12] text-accent-strong">
                  {r.icon}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <p className="text-[13px] text-ink-muted">{r.detail}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.div layout className="mt-5 border-t border-white/[0.08] pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <Receipt className="size-4" /> Total
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total ?? "none"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={spring.snappy}
                className="text-lg font-semibold tabular-nums tracking-tight"
              >
                {total ?? "-"}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-muted/80">
            <Clock className="size-3" />{" "}
            {step === "success"
              ? isDeposit
                ? `${dueToday} deposit paid`
                : "Paid"
              : isDeposit
                ? `${dueToday} deposit today, rest on the day`
                : "Charged at checkout"}
          </p>
        </motion.div>
      </motion.aside>

      {/* Mobile: floating bottom bar */}
      <AnimatePresence>
        {service && step !== "success" && (
          <motion.div
            key="mobile-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring.gentle}
            className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-2xl px-4 py-3 lg:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{service.name}</p>
              <p className="truncate text-[12px] text-ink-muted">
                {slot ? `${formatInTimeZone(new Date(slot.start), provider.timezone, "EEE, MMM d")} · ${slot.label}` : formatDuration(service.durationMinutes)}
              </p>
            </div>
            <span className="text-base font-semibold tabular-nums">{isDeposit ? dueToday : total}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
