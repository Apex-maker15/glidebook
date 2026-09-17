"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Lock } from "lucide-react";
import { loadStripe, type Stripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";

const stripeCache = new Map<string, Promise<Stripe | null>>();
export function getStripePromise(key: string) {
  let p = stripeCache.get(key);
  if (!p) {
    p = loadStripe(key);
    stripeCache.set(key, p);
  }
  return p;
}

export const stripeAppearance: StripeElementsOptions["appearance"] = {
  theme: "night",
  labels: "floating",
  variables: {
    colorPrimary: "#a89bff",
    colorBackground: "#0f1118",
    colorText: "#f4f5f9",
    colorTextSecondary: "#9298a8",
    colorDanger: "#fca5a5",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "14px",
    spacingUnit: "5px",
  },
  rules: {
    ".Input": { border: "1px solid rgba(255,255,255,0.09)", boxShadow: "none", backgroundColor: "rgba(255,255,255,0.04)" },
    ".Input:focus": { border: "1px solid rgba(168,155,255,0.6)", boxShadow: "0 0 0 4px rgba(139,124,255,0.14)" },
    ".Tab": { border: "1px solid rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.03)" },
    ".Tab--selected": { border: "1px solid rgba(168,155,255,0.6)", boxShadow: "0 0 0 4px rgba(139,124,255,0.14)" },
  },
};

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
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance, loader: "auto" }}>
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
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || !elements || !ready} loading={busy}>
        <Lock className="size-4" /> {label}
      </Button>
    </form>
  );
}
