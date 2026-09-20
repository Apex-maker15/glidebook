"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, ArrowUpRight, BadgeCheck, CircleDashed, ExternalLink, Search, Users } from "lucide-react";
import { Skeleton, StatusBadge } from "@/components/ui/primitives";
import { fadeVariants, spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import { CATEGORIES } from "@/lib/categories";
import { cn, formatMoney } from "@/lib/utils";
import type { BookingStatus, BusinessCategory, LocationMode } from "@/types";

type StripeState = "connected" | "incomplete" | "none";

export interface AdminProvider {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  slug: string | null;
  category: BusinessCategory | null;
  currency: string;
  country: string;
  locationMode: LocationMode;
  depositPercent: number;
  stripe: StripeState;
  payoutsEnabled: boolean;
  services: number;
  daysSet: number;
  bookings: number;
  paidBookings: number;
  depositsCents: number;
  feeCents: number;
  lastBookingAt: string | null;
  createdAt: string;
}

interface AdminBooking {
  id: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  amountCents: number;
  depositCents: number;
  platformFeeCents: number;
  currency: string;
  createdAt: string;
  cancelledBy: string | null;
  customer: { name: string; email: string };
  service: string;
  provider: { id: string; businessName: string | null; slug: string | null; timezone: string };
}

interface Overview {
  stripeConfigured: boolean;
  stats: {
    providers: number;
    providersConnected: number;
    providersLive: number;
    customers: number;
    bookingsTotal: number;
    bookingsWeek: number;
    paidBookings: number;
    byCurrency: { currency: string; depositsAllCents: number; depositsMonthCents: number; feeAllCents: number; feeMonthCents: number }[];
    setupRevenueCents: number;
    setupsPaid: number;
    setupsPending: number;
  };
  providers: AdminProvider[];
  bookings: AdminBooking[];
}

type Tab = "overview" | "providers" | "bookings";

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<Overview>("/api/admin/overview")
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.providers;
    return data.providers.filter((p) =>
      [p.businessName, p.name, p.email, p.slug, p.category && CATEGORIES[p.category].label].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, query]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Owner</p>
          <h1 className="text-gradient mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Everything on GlideBook</h1>
        </div>
        <nav className="glass flex rounded-xl p-1" aria-label="Admin sections">
          {(
            [
              ["overview", "Overview"],
              ["providers", "Providers"],
              ["bookings", "Bookings"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors", tab === t ? "text-ink" : "text-ink-muted hover:text-ink")}
            >
              {tab === t && <motion.span layoutId="owner-tab" transition={spring.morph} className="absolute inset-0 rounded-lg bg-white/10" />}
              <span className="relative">{label}</span>
            </button>
          ))}
          <Link href="/admin/setup" className="relative rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink">
            Setups{data && data.stats.setupsPending > 0 ? ` · ${data.stats.setupsPending}` : ""}
          </Link>
        </nav>
      </header>

      {error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {tab === "overview" && (
            <motion.div key="overview" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
              {!data.stripeConfigured && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    <span className="font-semibold">Stripe keys are not set on this deployment.</span> Nobody can take deposits or pay the setup fee until{" "}
                    <code className="font-mono text-xs">STRIPE_SECRET_KEY</code>, <code className="font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and{" "}
                    <code className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</code> are added in Vercel.
                  </p>
                </div>
              )}
              <Stats data={data} />
              <section>
                <h2 className="mb-3 text-sm font-semibold">Latest bookings</h2>
                <BookingsTable bookings={data.bookings.slice(0, 12)} />
              </section>
              <section>
                <h2 className="mb-3 text-sm font-semibold">Newest providers</h2>
                <ProvidersTable providers={data.providers.slice(0, 8)} />
              </section>
            </motion.div>
          )}
          {tab === "providers" && (
            <motion.div key="providers" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
              <label className="glass flex h-11 max-w-md items-center gap-2 rounded-2xl px-4 text-sm">
                <Search className="size-4 text-ink-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search business, name, email or link"
                  className="w-full bg-transparent outline-none placeholder:text-ink-muted/70"
                />
              </label>
              <ProvidersTable providers={filtered} />
            </motion.div>
          )}
          {tab === "bookings" && (
            <motion.div key="bookings" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <BookingsTable bookings={data.bookings} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/** "£12 · $40" - one figure per currency, never summed across them. */
function moneyList(rows: { currency: string; cents: number }[], fallback = "£0") {
  const parts = rows.filter((r) => r.cents > 0).map((r) => formatMoney(r.cents, r.currency));
  return parts.length ? parts.join(" · ") : fallback;
}

function Stats({ data }: { data: Overview }) {
  const s = data.stats;
  const fees = s.byCurrency.map((c) => ({ currency: c.currency, cents: c.feeAllCents + (c.currency === "gbp" ? s.setupRevenueCents : 0) }));
  if (s.setupRevenueCents > 0 && !s.byCurrency.some((c) => c.currency === "gbp")) fees.push({ currency: "gbp", cents: s.setupRevenueCents });
  const cards = [
    {
      label: "Your revenue",
      value: moneyList(fees),
      sub: `${moneyList(s.byCurrency.map((c) => ({ currency: c.currency, cents: c.feeMonthCents })))} fees last 30 days · ${s.setupsPaid} setups paid`,
      accent: true,
    },
    {
      label: "Deposits collected",
      value: moneyList(s.byCurrency.map((c) => ({ currency: c.currency, cents: c.depositsAllCents }))),
      sub: `${moneyList(s.byCurrency.map((c) => ({ currency: c.currency, cents: c.depositsMonthCents })))} last 30 days · ${s.paidBookings} paid bookings`,
    },
    { label: "Bookings", value: String(s.bookingsTotal), sub: `${s.bookingsWeek} in the last 7 days · ${s.customers} clients` },
    { label: "Providers", value: String(s.providers), sub: `${s.providersLive} with a live page · ${s.providersConnected} taking deposits` },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={cn("glass rounded-2xl p-4", c.accent && "ring-1 ring-accent/40 shadow-glow")}>
          <p className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">{c.label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{c.value}</p>
          <p className="mt-1 text-[12px] text-ink-muted">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function StripePill({ state }: { state: StripeState }) {
  if (state === "connected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
        <BadgeCheck className="size-3" /> Deposits on
      </span>
    );
  if (state === "incomplete")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
        <CircleDashed className="size-3" /> Stripe pending
      </span>
    );
  return <span className="inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink-muted">Pay on the day</span>;
}

function ProvidersTable({ providers }: { providers: AdminProvider[] }) {
  if (providers.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 text-sm text-ink-muted">
        <Users className="size-5" /> No providers match
      </div>
    );
  }
  return (
    <div className="glass overflow-x-auto rounded-3xl">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-ink-muted">
          <tr className="border-b border-white/[0.08]">
            <th className="px-4 py-3 font-medium">Business</th>
            <th className="px-4 py-3 font-medium">Page</th>
            <th className="px-4 py-3 font-medium">Payments</th>
            <th className="px-4 py-3 text-right font-medium">Bookings</th>
            <th className="px-4 py-3 text-right font-medium">Deposits</th>
            <th className="px-4 py-3 text-right font-medium">Your fee</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => {
            const live = p.services > 0 && p.daysSet > 0;
            return (
              <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/admin/providers/${p.id}`} className="font-semibold hover:text-accent-strong">
                    {p.businessName ?? p.name}
                  </Link>
                  <p className="text-[12px] text-ink-muted">
                    {p.category ? CATEGORIES[p.category].label : "Uncategorised"} · {p.email}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {live ? (
                    <span className="text-[12px] text-emerald-200">Live · {p.services} services</span>
                  ) : (
                    <span className="text-[12px] text-amber-200">{p.services === 0 ? "No services yet" : "No hours yet"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StripePill state={p.stripe} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.bookings}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(p.depositsCents, p.currency)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-accent-strong">{formatMoney(p.feeCents, p.currency)}</td>
                <td className="px-4 py-3 text-[12px] text-ink-muted">
                  {p.lastBookingAt ? `${formatDistanceToNowStrict(new Date(p.lastBookingAt))} ago` : `joined ${formatDistanceToNowStrict(new Date(p.createdAt))} ago`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {p.slug && (
                      <Link href={`/book/${p.slug}`} target="_blank" aria-label="Open booking page" className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.08] hover:text-ink">
                        <ExternalLink className="size-3.5" />
                      </Link>
                    )}
                    <Link href={`/admin/providers/${p.id}`} aria-label="Manage provider" className="rounded-lg p-1.5 text-ink-muted hover:bg-white/[0.08] hover:text-ink">
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BookingsTable({ bookings }: { bookings: AdminBooking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-ink-muted">No bookings yet</div>
    );
  }
  return (
    <div className="glass overflow-x-auto rounded-3xl">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-ink-muted">
          <tr className="border-b border-white/[0.08]">
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Paid</th>
            <th className="px-4 py-3 text-right font-medium">Your fee</th>
            <th className="px-4 py-3 font-medium">Booked</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
              <td className="px-4 py-3 tabular-nums">{formatInTimeZone(new Date(b.startTime), b.provider.timezone, "EEE d MMM, HH:mm")}</td>
              <td className="px-4 py-3">
                <p className="font-medium">{b.customer.name}</p>
                <p className="text-[12px] text-ink-muted">{b.customer.email}</p>
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/providers/${b.provider.id}`} className="hover:text-accent-strong">
                  {b.provider.businessName ?? "-"}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-muted">{b.service}</td>
              <td className="px-4 py-3">
                <StatusBadge status={b.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {b.depositCents > 0 ? formatMoney(b.depositCents, b.currency) : <span className="text-ink-muted">on the day</span>}
                <span className="block text-[11px] text-ink-muted">of {formatMoney(b.amountCents, b.currency)}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-accent-strong">{b.status === "PAID" ? formatMoney(b.platformFeeCents, b.currency) : "-"}</td>
              <td className="px-4 py-3 text-[12px] text-ink-muted">{formatDistanceToNowStrict(new Date(b.createdAt))} ago</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
