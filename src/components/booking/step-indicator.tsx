"use client";

import { motion } from "framer-motion";
import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion";
import { STEPS, useBookingStore, type Step } from "@/store/booking-store";
import { useProvider } from "./provider-context";

const labels: Record<Exclude<Step, "success">, string> = {
  service: "Service",
  datetime: "Date & time",
  customer: "Your details",
  payment: "Payment",
};

const allSteps = STEPS.filter((s): s is Exclude<Step, "success"> => s !== "success");
const noPaymentSteps = allSteps.filter((s) => s !== "payment");

export function StepIndicator() {
  const provider = useProvider();
  const visibleSteps = provider.takesDeposits ? allSteps : noPaymentSteps;
  const step = useBookingStore((s) => s.step);
  const goTo = useBookingStore((s) => s.goTo);
  const serviceId = useBookingStore((s) => s.serviceId);
  const slot = useBookingStore((s) => s.slot);
  const current = step === "success" ? visibleSteps.length : Math.max(0, visibleSteps.indexOf(step as Exclude<Step, "success">));

  const canJump = (i: number) => {
    if (step === "success" || step === "payment") return false;
    if (i >= current) return false;
    if (i === 1 && !serviceId) return false;
    if (i === 2 && !slot) return false;
    return true;
  };

  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Booking progress">
      {visibleSteps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!canJump(i)}
              onClick={() => goTo(s)}
              className={cn(
                "relative flex h-8 items-center gap-2 rounded-full px-2.5 text-[12px] font-medium transition-colors sm:px-3 sm:text-[13px]",
                active ? "text-black" : done ? "text-ink hover:bg-white/5" : "text-ink-muted/70",
                canJump(i) ? "cursor-pointer" : "cursor-default",
              )}
            >
              {active && (
                <motion.span
                  layoutId="step-pill"
                  transition={spring.morph}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active ? "bg-black/20 text-black" : done ? "bg-accent/25 text-accent-strong" : "bg-white/[0.08] text-ink-muted",
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={cn("hidden sm:inline", active && "font-semibold")}>{labels[s]}</span>
              </span>
            </button>
            {i < visibleSteps.length - 1 && (
              <span className="h-px w-3 bg-white/10 sm:w-5" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
