"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Clock, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton, TextArea } from "@/components/ui/primitives";
import { StripePayment } from "@/components/stripe-payment";
import { fadeVariants, spring } from "@/components/motion";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import { formatMoney } from "@/lib/utils";

interface SetupRequest {
  id: string;
  status: "PENDING_PAYMENT" | "PAID" | "DONE";
  notes: string;
  feeCents: number;
  currency: string;
  paidAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Props {
  publishableKey: string | null;
}

const PLACEHOLDER = `Paste your price list and hours, e.g.

Gel manicure - £35 - 1 hr
BIAB full set - £45 - 1.5 hrs
Infill - £30 - 1 hr

Tue-Sat 10am-7pm, lunch 1:30-2pm
Home studio in Croydon, 30% deposit`;

export function SetupOffer({ publishableKey }: Props) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<SetupRequest | null>(null);
  const [fee, setFee] = useState<{ cents: number; currency: string }>({ cents: 500, currency: "gbp" });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<{ clientSecret: string } | null>(null);
  const [paidLocally, setPaidLocally] = useState(false);
  const push = useToastStore((s) => s.push);

  const load = async () => {
    try {
      const r = await api<{ request: SetupRequest | null; feeCents: number; currency: string }>("/api/setup");
      setRequest(r.request);
      setFee({ cents: r.feeCents, currency: r.currency });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves, not synchronously
    void load();
  }, []);

  // After a successful card confirmation, poll until the webhook flips the request to PAID.
  useEffect(() => {
    if (!paidLocally || request) return;
    let attempts = 0;
    const id = setInterval(async () => {
      attempts += 1;
      await load();
      if (attempts >= 12) clearInterval(id);
    }, 2500);
    return () => clearInterval(id);
  }, [paidLocally, request]);

  const start = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await api<{ clientSecret: string }>("/api/setup", { method: "POST", body: { notes } });
      setPayment({ clientSecret: r.clientSecret });
    } catch (err) {
      const msg = err instanceof ClientApiError && err.issues?.notes?.[0] ? err.issues.notes[0] : errorMessage(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const feeLabel = formatMoney(fee.cents, fee.currency);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Onboarding</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Get your page set up</h1>
        <p className="mt-2 text-sm text-ink-muted">Two ways to go live. Both end with a booking link you can drop in your bio.</p>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-56 rounded-3xl" />
            <Skeleton className="h-56 rounded-3xl" />
          </motion.div>
        ) : request || paidLocally ? (
          <motion.div key="status" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="glass rounded-3xl p-6">
            {request?.status === "DONE" ? (
              <>
                <CheckCircle2 className="size-8 text-emerald-300" />
                <h2 className="mt-3 text-lg font-semibold">Your page is ready</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  We have added your services and hours. Check them under Services and Availability, then share your link.
                </p>
              </>
            ) : (
              <>
                <Clock className="size-8 text-accent-strong" />
                <h2 className="mt-3 text-lg font-semibold">{request ? "We're on it" : "Payment received - confirming"}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Thanks for the {feeLabel}. We will build your services and hours from what you sent, usually within 24 hours.
                  You will see them appear under Services and Availability.
                </p>
              </>
            )}
            {request && (
              <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[13px] text-ink-muted">
                <p className="mb-1 font-medium text-ink">What you sent</p>
                <p className="whitespace-pre-wrap">{request.notes}</p>
              </div>
            )}
          </motion.div>
        ) : payment && publishableKey ? (
          <motion.div key="pay" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Pay {feeLabel} to confirm</h2>
            <p className="mb-5 mt-1 text-sm text-ink-muted">One-off. Refunded if we cannot build your page.</p>
            <StripePayment
              publishableKey={publishableKey}
              clientSecret={payment.clientSecret}
              label={`Pay ${feeLabel}`}
              returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/setup`}
              onSucceeded={() => {
                setPaidLocally(true);
                push({ tone: "success", title: "Payment received", description: "We'll have your page ready soon." });
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="choose" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-4 sm:grid-cols-2">
            <motion.div whileHover={{ y: -2 }} transition={spring.soft} className="glass flex flex-col rounded-3xl p-6">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-ink">
                <Wrench className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Do it yourself</h2>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Free</p>
              <p className="mt-2 flex-1 text-sm text-ink-muted">
                Add your services with prices and durations, set your weekly hours and breaks, choose your deposit. Takes about 10
                minutes.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href="/dashboard/services" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/[0.08] text-sm font-medium transition-colors hover:bg-white/[0.12]">
                  <Wrench className="size-4" /> Add services
                </Link>
                <Link href="/dashboard/availability" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-sm font-medium transition-colors hover:bg-white/[0.1]">
                  <CalendarClock className="size-4" /> Set hours
                </Link>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} transition={spring.soft} className="glass-strong relative flex flex-col rounded-3xl p-6 ring-1 ring-accent/40 shadow-glow">
              <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-black">Popular</span>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/15 text-accent-strong">
                <Sparkles className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">We set it up for you</h2>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {feeLabel} <span className="text-sm font-normal text-ink-muted">one-off</span>
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Paste your price list and hours below (or a screenshot&apos;s worth of text). We build your services, durations,
                hours and deposit, usually within 24 hours.
              </p>
              <TextArea
                className="mt-4"
                label="Your services, prices and hours"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={8}
                error={error ?? undefined}
              />
              {!publishableKey && (
                <p className="mt-2 text-[12px] text-amber-200">Payments are not configured on this server yet.</p>
              )}
              <Button className="mt-4 w-full" size="lg" loading={submitting} disabled={!publishableKey || notes.trim().length < 20} onClick={() => void start()}>
                Continue to pay {feeLabel}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
