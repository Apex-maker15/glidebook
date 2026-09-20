"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spring, staggerContainer, riseVariants } from "@/components/motion";
import { useBookingStore } from "@/store/booking-store";
import { useProvider } from "./provider-context";
import { cn, formatDuration, formatMoney } from "@/lib/utils";

export function StepService() {
  const services = useBookingStore((s) => s.services);
  const provider = useProvider();
  const isDeposit = provider.takesDeposits && provider.depositPercent < 100;
  const serviceId = useBookingStore((s) => s.serviceId);
  const selectService = useBookingStore((s) => s.selectService);
  const next = useBookingStore((s) => s.next);

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Choose a service</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {provider.locationMode === "MOBILE"
            ? provider.serviceAreas
              ? `Pricing is all-inclusive. We come to you across ${provider.serviceAreas}.`
              : "Pricing is all-inclusive. We come to you."
            : "Pricing is all-inclusive."}
          {provider.depositMode === "link"
            ? provider.depositPercent < 100
              ? ` A ${provider.depositPercent}% deposit secures your slot - paid via ${provider.businessName}'s payment link right after booking.`
              : ` Paid in full via ${provider.businessName}'s payment link right after booking.`
            : isDeposit
              ? ` A ${provider.depositPercent}% deposit secures your slot; the rest is paid on the day.`
              : provider.takesDeposits
                ? " Paid securely by card when you book."
                : " Nothing to pay online - you pay on the day."}
        </p>
      </header>

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-ink-muted">
          This provider has not published any services yet.
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Services"
        >
          {services.map((svc) => {
            const active = svc.id === serviceId;
            return (
              <motion.li key={svc.id} variants={riseVariants}>
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectService(svc.id)}
                  onDoubleClick={() => {
                    selectService(svc.id);
                    next();
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={spring.snappy}
                  className={cn(
                    "relative flex h-full w-full flex-col rounded-2xl border p-4 text-left outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent/70 sm:p-5",
                    active ? "border-transparent bg-accent-soft" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="service-active"
                      transition={spring.morph}
                      className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-accent/70 shadow-glow"
                    />
                  )}
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{svc.name}</h3>
                      {svc.description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{svc.description}</p>}
                    </div>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                        active ? "border-accent bg-accent text-black" : "border-white/15 text-transparent",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  </div>
                  <div className="relative mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                      <Clock className="size-3.5" /> {formatDuration(svc.durationMinutes)}
                    </span>
                    <span className="text-lg font-semibold tracking-tight">{formatMoney(svc.priceCents, svc.currency)}</span>
                  </div>
                </motion.button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      <div className="mt-6 flex justify-end">
        <Button size="lg" disabled={!serviceId} onClick={next}>
          Pick a time <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
