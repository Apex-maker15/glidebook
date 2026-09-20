"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
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
import { ProviderProvider } from "./provider-context";

interface Props {
  provider: ProviderDTO;
  services: ServiceDTO[];
  stripePublishableKey: string | null;
}

/** The booking flow itself: steps on the left, live summary on the right. The page around it is the provider's. */
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

  return (
    <ProviderProvider value={provider}>
      <section id="book" ref={topRef} className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-4 pt-10 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="font-display text-2xl font-medium tracking-tight">Book an appointment</h2>
          <StepIndicator />
        </div>

        <LayoutGroup id="booking">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <motion.div layout transition={spring.soft} className="glass relative overflow-hidden rounded-3xl p-5 sm:p-8">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div key={step} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" className="will-change-transform">
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
      </section>
    </ProviderProvider>
  );
}
