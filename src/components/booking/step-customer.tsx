"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Lock, MapPin } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/primitives";
import { useBookingStore } from "@/store/booking-store";

export function StepCustomer() {
  const provider = useBookingStore((s) => s.provider)!;
  const customer = useBookingStore((s) => s.customer);
  const errors = useBookingStore((s) => s.customerErrors);
  const setCustomer = useBookingStore((s) => s.setCustomer);
  const submit = useBookingStore((s) => s.submitCustomer);
  const submitStatus = useBookingStore((s) => s.submitStatus);
  const submitError = useBookingStore((s) => s.submitError);
  const back = useBookingStore((s) => s.back);

  const meta = CATEGORIES[provider.category];
  const mobile = provider.locationMode === "MOBILE";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
    >
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Your details</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {mobile ? "We only use this to confirm and find you on the day." : "We only use this to confirm your appointment."}
        </p>
      </header>

      <AnimatePresence initial={false}>
        {submitStatus === "error" && submitError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{submitError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Alex Morgan"
          value={customer.name}
          onChange={(e) => setCustomer({ name: e.target.value })}
          error={errors.name}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="alex@example.com"
          value={customer.email}
          onChange={(e) => setCustomer({ email: e.target.value })}
          error={errors.email}
          hint="Your receipt goes here"
        />
        <Field
          label="Phone (optional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+1 555 000 0000"
          value={customer.phone}
          onChange={(e) => setCustomer({ phone: e.target.value })}
          error={errors.phone}
        />
        <Field
          label={meta.detailsLabel}
          name="serviceDetails"
          placeholder={meta.detailsPlaceholder}
          value={customer.serviceDetails}
          onChange={(e) => setCustomer({ serviceDetails: e.target.value })}
        />
        {mobile ? (
          <Field
            className="sm:col-span-2"
            label="Service address"
            name="address"
            autoComplete="street-address"
            placeholder="Street, town, postcode"
            value={customer.address}
            onChange={(e) => setCustomer({ address: e.target.value })}
            error={errors.address}
          />
        ) : provider.studioAddress ? (
          <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-sm sm:col-span-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent-strong" />
            <div>
              <p className="font-medium">Where to go</p>
              <p className="text-ink-muted">{provider.studioAddress}</p>
            </div>
          </div>
        ) : null}
        <TextArea
          className="sm:col-span-2"
          label="Notes for the provider (optional)"
          name="notes"
          placeholder={mobile ? "Gate code, parking instructions, anything we should know" : "Anything else before your appointment"}
          value={customer.notes}
          onChange={(e) => setCustomer({ notes: e.target.value })}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={back}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button type="submit" size="lg" loading={submitStatus === "submitting"}>
          <Lock className="size-4" /> Continue to payment
        </Button>
      </div>
    </form>
  );
}
