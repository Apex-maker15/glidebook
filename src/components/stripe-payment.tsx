"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, Warning } from "@/components/icons";
import { loadStripe, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { useTheme } from "@/components/theme/use-theme";
import type { Theme } from "@/components/theme/theme";

const stripeCache = new Map<string, Promise<Stripe | null>>();
export function getStripePromise(key: string) {
  let p = stripeCache.get(key);
  if (!p) {
    p = loadStripe(key);
    stripeCache.set(key, p);
  }
  return p;
}

/** Payment Element styling that matches whichever theme the page is showing. */
export function stripeAppearanceFor(theme: Theme): StripeElementsOptions["appearance"] {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d9542f";
  const dark = theme === "dark";
  return {
    theme: dark ? "night" : "stripe",
    labels: "floating",
    variables: {
      colorPrimary: accent,
      colorBackground: dark ? "#151518" : "#fffdf9",
      colorText: dark ? "#f2f1ee" : "#17161a",
      colorTextSecondary: dark ? "#9a9aa3" : "#6b6a72",
      colorDanger: dark ? "#fca5a5" : "#b91c1c",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      borderRadius: "14px",
      spacingUnit: "5px",
    },
    rules: {
      ".Input": {
        border: `1px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(22,20,16,0.12)"}`,
        boxShadow: "none",
        backgroundColor: dark ? "rgba(255,255,255,0.04)" : "#ffffff",
      },
      ".Input:focus": { border: `1px solid ${accent}`, boxShadow: `0 0 0 4px ${accent}22` },
      ".Tab": {
        border: `1px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(22,20,16,0.12)"}`,
        backgroundColor: dark ? "rgba(255,255,255,0.03)" : "#ffffff",
      },
      ".Tab--selected": { border: `1px solid ${accent}`, boxShadow: `0 0 0 4px ${accent}22` },
    },
  };
}

interface Props {
  publishableKey: string;
  clientSecret: string;
  /** Button label, e.g. "Pay £5". */
  label: string;
  returnUrl: string;
  onSucceeded: () => void;
}

/** Self-contained Payment Element form for one-off charges (setup fee, etc.). */
export function StripePayment({ publishableKey, clientSecret, label, returnUrl, onSucceeded }: Props) {
  const stripePromise = useMemo(() => getStripePromise(publishableKey), [publishableKey]);
  const [theme] = useTheme();
  const appearance = useMemo(() => stripeAppearanceFor(theme), [theme]);
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance, loader: "auto" }}>
      <Form label={label} returnUrl={returnUrl} onSucceeded={onSucceeded} />
    </Elements>
  );
}

function Form({ label, returnUrl, onSucceeded }: Omit<Props, "publishableKey" | "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check your payment details");
      setBusy(false);
      return;
    }
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
    setBusy(false);
    if (confirmError) {
      setError(confirmError.message ?? "Payment was declined");
      return;
    }
    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") onSucceeded();
    else setError("Payment was not completed. Please try again.");
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="relative min-h-[220px]">
        {!ready && (
          <div className="absolute inset-0 space-y-3" aria-hidden>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
        </motion.div>
      </div>
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-bad/25 bg-bad/10 p-3.5 text-sm text-bad">
          <Warning className="mt-0.5 size-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || !elements || !ready} loading={busy}>
        <Lock className="size-4" /> {label}
      </Button>
    </form>
  );
}
