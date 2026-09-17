"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";
import { useBookingStore } from "@/store/booking-store";
import type { ProviderDTO, ServiceDTO } from "@/types";
import { spring, stepVariants } from "@/components/motion";
import { StepIndicator } from "./step-indicator";
import { StepService } from "./step-service";
import { StepDateTime } from "./step-datetime";
import { StepCustomer } from "./step-customer";
import { StepPayment } from "./step-payment";
import { StepSuccess } from "./step-success";
import { SummaryCard } from "./summary-card";

interface Props {
  provider: ProviderDTO;
  services: ServiceDTO[];
  stripePublishableKey: string | null;
}

export function BookingWizard({ provider, services, stripePublishableKey }: Props) {
  const init = useBookingStore((s) => s.init);
  const step = useBookingStore((s) => s.step);
  const direction = useBookingStore((s) => s.direction);
  const initialised = useRef<true | null>(null);

  // Hydrate the store synchronously on first render so the first paint is complete.
  if (initialised.current == null) {
    init(provider, services);
    initialised.current = true;
  }

  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step === "service") return;
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const meta = CATEGORIES[provider.category];

  return (
    <div data-accent={meta.accent} className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
            <Sparkles className="size-4" />
          </span>
          GlideBook
        </Link>
        <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:flex">
          <ShieldCheck className="size-3.5" /> Secure checkout by Stripe
        </span>
      </header>

      <main ref={topRef} className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:pb-16">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
          className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent-strong ring-1 ring-accent/30 shadow-glow">
              <CategoryIcon category={provider.category} className="size-7" />
            </div>
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                {meta.tagline}
              </p>
              <h1 className="text-gradient text-2xl font-semibold tracking-tight sm:text-3xl">{provider.businessName}</h1>
            </div>
          </div>
          <StepIndicator />
        </motion.section>

        <LayoutGroup id="booking">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <motion.div layout transition={spring.soft} className="glass relative overflow-hidden rounded-3xl p-5 sm:p-8">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="will-change-transform"
                >
                  {step === "service" && <StepService />}
                  {step === "datetime" && <StepDateTime />}
                  {step === "customer" && <StepCustomer />}
                  {step === "payment" && <StepPayment publishableKey={stripePublishableKey} />}
                  {step === "success" && <StepSuccess />}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <SummaryCard />
          </div>
        </LayoutGroup>
      </main>
    </div>
  );
}
