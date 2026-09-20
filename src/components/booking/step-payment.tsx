"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Lock, ShieldCheck, TimerReset } from "lucide-react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { fadeVariants } from "@/components/motion";
import { useBookingStore, selectService } from "@/store/booking-store";
import { formatMoney } from "@/lib/utils";

import { getStripePromise, stripeAppearanceFor } from "@/components/stripe-payment";
import { useTheme } from "@/components/theme/use-theme";

export function StepPayment({ publishableKey }: { publishableKey: string | null }) {
  const checkout = useBookingStore((s) => s.checkout);
  const submitStatus = useBookingStore((s) => s.submitStatus);
  const submitError = useBookingStore((s) => s.submitError);
  const retryCheckout = useBookingStore((s) => s.retryCheckout);
  const back = useBookingStore((s) => s.back);

  const stripePromise = useMemo(() => (publishableKey ? getStripePromise(publishableKey) : null), [publishableKey]);
  const [theme] = useTheme();
  const appearance = useMemo(() => stripeAppearanceFor(theme), [theme]);
  const ready = Boolean(checkout && stripePromise);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Payment</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <ShieldCheck className="size-3.5" /> Encrypted and processed by Stripe
          </p>
        </div>
        {checkout && <HoldCountdown expiresAt={checkout.holdExpiresAt} />}
      </header>

      <div className="stripe-element-shell relative">
        <AnimatePresence mode="wait" initial={false}>
          {!publishableKey ? (
            <motion.div key="nokey" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <Notice title="Payments are not set up yet">
                Add <code className="font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and{" "}
                <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> to enable checkout. Your slot is still held.
              </Notice>
            </motion.div>
          ) : submitStatus === "error" && submitError ? (
            <motion.div key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <Notice title="We could not start checkout">{submitError}</Notice>
              <Button variant="secondary" onClick={() => void retryCheckout()}>
                Try again
              </Button>
            </motion.div>
          ) : !ready ? (
            <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3" aria-busy>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
              <Skeleton className="h-12 rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12 rounded-2xl" />
                <Skeleton className="h-12 rounded-2xl" />
              </div>
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="mt-6 h-[52px] rounded-2xl" />
            </motion.div>
          ) : (
            <motion.div key="elements" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <Elements stripe={stripePromise} options={{ clientSecret: checkout!.clientSecret, appearance, loader: "auto" }}>
                <CheckoutForm />
              </Elements>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6">
        <Button type="button" variant="ghost" onClick={back} disabled={submitStatus === "submitting"}>
          <ArrowLeft className="size-4" /> Edit details
        </Button>
      </div>
    </div>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const checkout = useBookingStore((s) => s.checkout)!;
  const booking = useBookingStore((s) => s.booking);
  const customer = useBookingStore((s) => s.customer);
  const service = useBookingStore(selectService);
  const paymentStatus = useBookingStore((s) => s.paymentStatus);
  const paymentError = useBookingStore((s) => s.paymentError);
  const setPaymentStatus = useBookingStore((s) => s.setPaymentStatus);
  const [elementReady, setElementReady] = useState(false);
  const isDeposit = checkout.amountCents < checkout.totalCents;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !booking) return;
    setPaymentStatus("processing");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setPaymentStatus("error", submitError.message ?? "Please check your payment details");
      return;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${origin}/book/return?booking=${booking.id}`,
        receipt_email: customer.email.trim(),
        payment_method_data: { billing_details: { name: customer.name.trim(), email: customer.email.trim() } },
      },
      redirect: "if_required",
    });

    if (error) {
      setPaymentStatus("error", error.message ?? "Payment was declined");
      return;
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      setPaymentStatus("succeeded");
      return;
    }
    setPaymentStatus("error", "Payment was not completed. Please try again.");
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <div className="relative">
        {!elementReady && (
          <div className="absolute inset-0 space-y-3" aria-hidden>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: elementReady ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <PaymentElement onReady={() => setElementReady(true)} options={{ layout: "tabs" }} />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {paymentStatus === "error" && paymentError && (
          <motion.div
            key="pay-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <Notice title="Payment failed">{paymentError}</Notice>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!stripe || !elements || !elementReady}
        loading={paymentStatus === "processing"}
      >
        <Lock className="size-4" />
        {isDeposit ? "Pay " : "Pay "}
        {formatMoney(checkout.amountCents, checkout.currency)}
        {isDeposit ? " deposit" : ""}
        {service ? ` for ${service.name}` : ""}
      </Button>
      <p className="text-center text-[12px] text-ink-muted">
        {isDeposit
          ? `The remaining ${formatMoney(checkout.totalCents - checkout.amountCents, checkout.currency)} is paid on the day. Cancellations by the provider are refunded in full.`
          : "You will be charged now. Cancellations by the provider are refunded in full."}
      </p>
    </form>
  );
}

function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const goTo = useBookingStore((s) => s.goTo);
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const expired = remaining === 0;

  return (
    <button
      type="button"
      onClick={expired ? () => goTo("datetime") : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium tabular-nums transition-colors ${
        expired ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-white/10 bg-white/[0.04] text-ink-muted"
      }`}
      title={expired ? "Pick a new time" : "Your slot is held while you pay"}
    >
      <TimerReset className="size-3.5" />
      {expired ? "Hold expired - choose a time" : `Held for ${mins}:${String(secs).padStart(2, "0")}`}
    </button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-amber-100/80">{children}</p>
      </div>
    </div>
  );
}
