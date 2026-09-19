"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, BadgeCheck, Banknote, CircleDashed, Landmark, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { fadeVariants, spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import { cn, formatMoney } from "@/lib/utils";

interface ConnectResponse {
  status: {
    configured: boolean;
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsDue: string[];
  };
  country: string;
  currency: string;
  fee: { percent: number; minCents: number };
  earnings: {
    month: { bookings: number; depositsCents: number; feesCents: number };
    allTime: { bookings: number; depositsCents: number; feesCents: number };
  };
}

const REQUIREMENT_LABELS: Record<string, string> = {
  external_account: "bank account for payouts",
  "individual.verification.document": "photo ID",
  "individual.dob.day": "date of birth",
  "individual.address.line1": "home address",
  "business_profile.url": "website",
  "tos_acceptance.date": "accepting Stripe's terms",
};

function humanRequirement(key: string): string {
  if (REQUIREMENT_LABELS[key]) return REQUIREMENT_LABELS[key];
  return key.split(".").pop()!.replace(/_/g, " ");
}

/**
 * Stripe Connect onboarding + earnings. Providers connect their own Stripe
 * account (hosted onboarding, nothing to build), deposits land there
 * automatically and GlideBook keeps a small application fee.
 */
export function PaymentsPanel() {
  const params = useSearchParams();
  const returned = params.get("return") === "1";
  const refreshed = params.get("refresh") === "1";
  const [data, setData] = useState<ConnectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"onboard" | "dashboard" | "refresh" | null>(null);
  const push = useToastStore((s) => s.push);

  const load = useCallback(async () => {
    try {
      setData(await api<ConnectResponse>("/api/connect"));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves, not synchronously
    void load();
  }, [load]);

  useEffect(() => {
    if (returned && data?.status.chargesEnabled) {
      push({ tone: "success", title: "Stripe connected", description: "Your booking page now takes deposits." });
    }
    // Only fire once the first load after returning from Stripe has landed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returned, data?.status.chargesEnabled]);

  const onboard = async () => {
    setBusy("onboard");
    try {
      const { url } = await api<{ url: string }>("/api/connect", { method: "POST" });
      window.location.assign(url);
    } catch (err) {
      push({ tone: "error", title: "Could not open Stripe", description: errorMessage(err) });
      setBusy(null);
    }
  };

  const openDashboard = async () => {
    setBusy("dashboard");
    try {
      const { url } = await api<{ url: string }>("/api/connect/dashboard", { method: "POST" });
      window.open(url, "_blank", "noopener");
    } catch (err) {
      push({ tone: "error", title: "Could not open Stripe", description: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    setBusy("refresh");
    await load();
    setBusy(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Payments</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Deposits and payouts</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Connect your own Stripe account and every deposit is paid straight to your bank. No monthly fee.
        </p>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!data && !error ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </motion.div>
        ) : error ? (
          <motion.p key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="text-sm text-red-300">
            {error}
          </motion.p>
        ) : (
          <motion.div key="content" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            <StatusCard
              data={data!}
              busy={busy}
              onboard={onboard}
              openDashboard={openDashboard}
              refresh={refresh}
              justReturned={returned || refreshed}
            />
            <Earnings data={data!} />
            <FeeExplainer data={data!} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusCard({
  data,
  busy,
  onboard,
  openDashboard,
  refresh,
  justReturned,
}: {
  data: ConnectResponse;
  busy: "onboard" | "dashboard" | "refresh" | null;
  onboard: () => void;
  openDashboard: () => void;
  refresh: () => void;
  justReturned: boolean;
}) {
  const s = data.status;

  if (!s.configured) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-amber-400/25 bg-amber-400/10 p-5 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Payments are not configured on this server yet</p>
          <p className="mt-1 text-amber-100/80">
            Until Stripe keys are added, your booking page still works: clients book without a deposit and pay you on the day.
          </p>
        </div>
      </div>
    );
  }

  if (s.chargesEnabled) {
    return (
      <motion.div layout transition={spring.soft} className="glass-strong rounded-3xl p-6 ring-1 ring-emerald-400/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <BadgeCheck className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">You&apos;re taking deposits</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Clients pay by card when they book. Stripe pays you out automatically
                {s.payoutsEnabled ? "." : " once your bank details are verified."}
              </p>
              {!s.payoutsEnabled && s.requirementsDue.length > 0 && (
                <p className="mt-2 text-[13px] text-amber-200">
                  Stripe still needs: {s.requirementsDue.slice(0, 3).map(humanRequirement).join(", ")}.
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={refresh} aria-label="Refresh status" className="rounded-lg p-2 text-ink-muted hover:bg-white/[0.08] hover:text-ink">
            <RefreshCw className={cn("size-4", busy === "refresh" && "animate-spin")} />
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openDashboard} loading={busy === "dashboard"}>
            <Landmark className="size-4" /> Payouts &amp; balance <ArrowUpRight className="size-3.5" />
          </Button>
          {!s.payoutsEnabled && (
            <Button variant="ghost" onClick={onboard} loading={busy === "onboard"}>
              Finish verification
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  const resuming = s.connected;
  return (
    <motion.div layout transition={spring.soft} className="glass-strong rounded-3xl p-6 ring-1 ring-accent/40 shadow-glow">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/15 text-accent-strong">
          {resuming ? <CircleDashed className="size-6" /> : <Banknote className="size-6" />}
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{resuming ? "Almost there" : "Start taking deposits"}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {resuming
              ? justReturned && !s.detailsSubmitted
                ? "Stripe did not get everything it needs. Pick up where you left off - it only takes a minute."
                : "Stripe is checking your details. This usually takes a few minutes; refresh to see if you're live."
              : "Stripe will ask for your name, date of birth, address and the bank account to pay you into. Takes about two minutes and you never leave your phone."}
          </p>
          {resuming && s.requirementsDue.length > 0 && (
            <p className="mt-2 text-[13px] text-amber-200">
              Still needed: {s.requirementsDue.slice(0, 4).map(humanRequirement).join(", ")}.
            </p>
          )}
          <ul className="mt-4 grid gap-2 text-[13px] text-ink-muted sm:grid-cols-3">
            {["Deposits land in your bank", "Late cancellations keep the deposit", "No monthly fee, ever"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 shrink-0 text-accent-strong" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={onboard} loading={busy === "onboard"}>
          {resuming ? "Continue with Stripe" : "Connect with Stripe"} <ArrowUpRight className="size-4" />
        </Button>
        {resuming && (
          <Button variant="ghost" onClick={refresh} loading={busy === "refresh"}>
            <RefreshCw className="size-4" /> Check again
          </Button>
        )}
      </div>
      <p className="mt-3 text-[12px] text-ink-muted/80">
        Until you connect, your booking page still works - clients book without a deposit and pay you on the day.
      </p>
    </motion.div>
  );
}

function Earnings({ data }: { data: ConnectResponse }) {
  const { month, allTime } = data.earnings;
  const cur = data.currency;
  const net = (d: { depositsCents: number; feesCents: number }) => d.depositsCents - d.feesCents;
  const cells = [
    { label: "Deposits this month", value: formatMoney(net(month), cur), sub: `${month.bookings} paid booking${month.bookings === 1 ? "" : "s"}` },
    { label: "All time", value: formatMoney(net(allTime), cur), sub: `${allTime.bookings} paid booking${allTime.bookings === 1 ? "" : "s"}` },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cells.map((c) => (
        <div key={c.label} className="glass rounded-3xl p-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-muted">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{c.value}</p>
          <p className="mt-1 text-[13px] text-ink-muted">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function FeeExplainer({ data }: { data: ConnectResponse }) {
  const { percent, minCents } = data.fee;
  const cur = data.currency;
  const example = 1500;
  const fee = Math.min(example, Math.max(minCents, Math.round((example * percent) / 100)));
  return (
    <div className="glass rounded-3xl p-5 text-sm text-ink-muted">
      <p className="font-medium text-ink">How the fee works</p>
      <p className="mt-1">
        GlideBook keeps {percent}% of each deposit (minimum {formatMoney(minCents, cur)}), taken automatically before the payout. Stripe
        charges its standard card fee on top. On a {formatMoney(example, cur)} deposit that is {formatMoney(fee, cur)} to us; the rest goes to you.
        Nothing is charged when you are not booked.
      </p>
    </div>
  );
}
