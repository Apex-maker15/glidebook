"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Clock, Minus, Repeat2, Sparkles, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/primitives";
import { fadeVariants, spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import type { BusinessInsights } from "@/types";

export interface BusinessPanelProps {
  /** Admins may look at another provider's numbers. */
  providerId?: string;
  /** Hide the page header when rendered inside another screen. */
  embedded?: boolean;
}

const RANGES: { days: number; label: string; noun: string }[] = [
  { days: 7, label: "7 days", noun: "week" },
  { days: 30, label: "30 days", noun: "month" },
  { days: 90, label: "90 days", noun: "quarter" },
];

function scoped(path: string, providerId?: string) {
  if (!providerId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}providerId=${encodeURIComponent(providerId)}`;
}

const percent = (rate: number | null | undefined, digits = 0) => (rate == null ? "—" : `${(rate * 100).toFixed(digits)}%`);

/** Indexed by `weekday.day` (0 = Sunday), for prose where the short label would not read. */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Percentage change, or null when the previous period was empty and any change is division by zero. */
function change(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}

export function BusinessPanel({ providerId, embedded }: BusinessPanelProps = {}) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<BusinessInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Refetches dim the numbers in place; a skeleton here would flash the page on every range change.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Flipping range twice quickly can land the responses out of order; only the latest wins.
    let current = true;
    api<{ insights: BusinessInsights }>(scoped(`/api/business?range=${days}`, providerId))
      .then((r) => {
        if (!current) return;
        setData(r.insights);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!current) return;
        setError(errorMessage(err));
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [days, providerId]);

  const pick = (next: number) => {
    if (next === days) return;
    setLoading(true);
    setDays(next);
  };

  const range = RANGES.find((r) => r.days === days) ?? RANGES[1];

  return (
    <div className={embedded ? "" : "mx-auto max-w-6xl"}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {!embedded && <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business</p>}
          <h1 className={embedded ? "text-lg font-semibold" : "text-gradient mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"}>
            How the business is doing
          </h1>
        </div>
        {/* One filter row, above everything it scopes. */}
        <nav className="glass flex rounded-xl p-1" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => pick(r.days)}
              aria-pressed={days === r.days}
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                days === r.days ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {days === r.days && <motion.span layoutId="business-range" transition={spring.morph} className="absolute inset-0 rounded-lg bg-white/10" />}
              <span className="relative">{r.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : !data ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      ) : (
        <div className={cn("space-y-4 transition-opacity duration-200", loading && "opacity-60")}>
          <Headline data={data} noun={range.noun} />
          {data.totals.appointments === 0 && data.upcoming.appointments === 0 ? (
            <EmptyState days={days} />
          ) : (
            <>
              <Takeaways data={data} noun={range.noun} />
              <Tiles data={data} noun={range.noun} />
              <Trend data={data} />
              <div className="grid gap-4 lg:grid-cols-2">
                <TopServices data={data} />
                <Regulars data={data} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <BusiestDays data={data} />
                <BusiestTimes data={data} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Headline ───────────────────────── */

function Delta({ value, period }: { value: number | null; period: string }) {
  if (value == null) return <span className="text-[13px] text-ink-muted">no earlier {period} to compare with</span>;
  const flat = Math.abs(value) < 0.005;
  const good = flat ? null : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] font-medium", good == null ? "text-ink-muted" : good ? "text-emerald-400" : "text-red-400")}>
      <Icon className="size-3.5" aria-hidden />
      {flat ? "Level" : `${value > 0 ? "+" : "−"}${Math.abs(value * 100).toFixed(0)}%`}
      <span className="font-normal text-ink-muted">vs the {period} before</span>
    </span>
  );
}

function Headline({ data, noun }: { data: BusinessInsights; noun: string }) {
  const { totals, upcoming, currency, timezone } = data;
  const next = upcoming.nextAt ? formatInTimeZone(new Date(upcoming.nextAt), timezone, "EEE d MMM, h:mm a") : null;

  return (
    <div className="glass-strong grid gap-px overflow-hidden rounded-3xl sm:grid-cols-2">
      <div className="p-5 sm:p-6">
        <p className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">Earned · last {data.range.days} days</p>
        {/* Hero figure: sans, proportional digits - tabular-nums makes a large number look loose. */}
        <p className="mt-2 text-[44px] font-semibold leading-none tracking-tight sm:text-[52px]">{formatMoney(totals.earnedCents, currency)}</p>
        <div className="mt-2.5">
          <Delta value={change(totals.earnedCents, data.previous.earnedCents)} period={noun} />
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">
          {totals.appointments} appointment{totals.appointments === 1 ? "" : "s"} · {totals.clients} client{totals.clients === 1 ? "" : "s"} ·{" "}
          {formatMoney(totals.averageTicketCents, currency)} average
        </p>
      </div>

      <div className="flex flex-col justify-between gap-4 bg-white/[0.03] p-5 sm:p-6">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">Booked ahead</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(upcoming.valueCents, currency)}</p>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {upcoming.appointments} upcoming · {upcoming.week} in the next 7 days
          </p>
          {next && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink">
              <CalendarClock className="size-3.5 text-accent-strong" aria-hidden /> Next: {next}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-3 border-t border-line pt-3.5 text-[12px]">
          <div>
            <dt className="text-ink-muted">Paid online</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatMoney(totals.collectedCents, currency)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Due on the day</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{formatMoney(totals.dueOnTheDayCents, currency)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Clients book</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{totals.leadTimeDays == null ? "—" : `${totals.leadTimeDays} days ahead`}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ───────────────────────── Takeaways ───────────────────────── */

/** The page in words: the two or three things worth saying out loud. */
function Takeaways({ data, noun }: { data: BusinessInsights; noun: string }) {
  const { totals, services, weekdays, utilisation, currency } = data;
  const lines: string[] = [];

  const top = services[0];
  if (top && services.length > 1) lines.push(`${top.name} brings in the most — ${formatMoney(top.earnedCents, currency)}, ${percent(top.share)} of the period.`);

  const busiest = [...weekdays].sort((a, b) => b.appointments - a.appointments)[0];
  if (busiest && busiest.appointments > 0 && totals.appointments >= 3) {
    lines.push(`${DAY_NAMES[busiest.day]} is your busiest day — ${percent(busiest.appointments / totals.appointments)} of your appointments.`);
  }

  if (totals.clients >= 3 && totals.repeatRate != null) {
    lines.push(`${percent(totals.repeatRate)} of the clients you saw had been to you before.`);
  }

  if (utilisation.rate != null && utilisation.openMinutes > 0) {
    lines.push(`You sold ${percent(utilisation.rate)} of the hours you were open this ${noun}.`);
  }

  if (lines.length === 0) return null;

  return (
    <div className="glass flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-4 py-3">
      <Sparkles className="size-4 shrink-0 text-accent-strong" aria-hidden />
      {lines.slice(0, 3).map((line) => (
        <p key={line} className="text-[13px] text-ink-muted">
          {line}
        </p>
      ))}
    </div>
  );
}

/* ───────────────────────── Stat tiles ───────────────────────── */

function Tile({ label, value, sub, icon: Icon, children }: { label: string; value: string; sub?: React.ReactNode; icon: typeof Users; children?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col rounded-2xl p-4">
      <p className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wider text-ink-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      {children}
      {sub && <p className="mt-1 text-[12px] text-ink-muted">{sub}</p>}
    </div>
  );
}

function Tiles({ data, noun }: { data: BusinessInsights; noun: string }) {
  const { totals, utilisation, currency } = data;
  const hours = (m: number) => formatDuration(Math.round(m));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Chair time sold"
        value={percent(utilisation.rate)}
        icon={Clock}
        sub={
          utilisation.rate == null ? (
            <Link href="/dashboard/availability" className="text-accent-strong underline-offset-2 hover:underline">
              Set your hours to see this
            </Link>
          ) : (
            `${hours(utilisation.bookedMinutes)} booked of ${hours(utilisation.openMinutes)} open`
          )
        }
      >
        {utilisation.rate != null && (
          // Meter: fill in the accent, track a lighter step of the same hue.
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-accent/15" role="presentation">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, utilisation.rate * 100)}%` }} />
          </div>
        )}
      </Tile>

      <Tile
        label="Clients came back"
        value={percent(totals.repeatRate)}
        icon={Repeat2}
        sub={`${totals.returningClients} returning · ${totals.newClients} new`}
      />

      <Tile label="Average booking" value={formatMoney(totals.averageTicketCents, currency)} icon={TrendingUp} sub={`across ${totals.appointments} appointment${totals.appointments === 1 ? "" : "s"}`} />

      <Tile
        label="Cancelled"
        value={totals.cancellationRate == null ? "—" : percent(totals.cancellationRate)}
        icon={Users}
        sub={`${totals.cancelled} this ${noun} · ${totals.cancelledByClient} by the client`}
      />
    </div>
  );
}

/* ───────────────────────── Charts ───────────────────────── */

function Panel({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-[13px] font-semibold">{title}</h2>
      {caption && <p className="mt-0.5 text-[12px] text-ink-muted">{caption}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Columns over time. One series, so no legend: the title says what is plotted.
 * Only the peak is labelled - every other value is on the bar's own hover/focus
 * tooltip and in its accessible name, so nothing is gated behind a pointer.
 */
function Trend({ data }: { data: BusinessInsights }) {
  const { trend, currency, range } = data;
  const peak = Math.max(...trend.map((t) => t.earnedCents), 0);
  const peakIndex = trend.findIndex((t) => t.earnedCents === peak && peak > 0);

  return (
    <Panel
      title={`Money in, by ${range.weekly ? "week" : "day"}`}
      caption={`${formatMoney(trend.reduce((n, t) => n + t.earnedCents, 0), currency)} across the last ${range.days} days`}
    >
      <div className="flex h-36 items-end gap-[2px]" role="list">
        {trend.map((bucket, i) => {
          const height = peak > 0 ? (bucket.earnedCents / peak) * 100 : 0;
          const label = `${bucket.label}: ${formatMoney(bucket.earnedCents, currency)}, ${bucket.appointments} appointment${bucket.appointments === 1 ? "" : "s"}`;
          return (
            <div
              key={bucket.start}
              role="listitem"
              tabIndex={0}
              aria-label={label}
              className="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none"
            >
              <span className="pointer-events-none absolute inset-x-0 bottom-full z-10 mx-auto mb-1 w-max max-w-[160px] rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink hidden shadow-pop group-hover:block group-focus-visible:block">
                {label}
              </span>
              {i === peakIndex && (
                <span className="mb-1 text-center text-[10px] font-semibold tabular-nums text-ink-muted">{formatMoney(bucket.earnedCents, currency)}</span>
              )}
              <div
                className={cn("mx-auto w-full max-w-6 rounded-t-[4px] transition-colors", bucket.earnedCents > 0 ? "bg-accent group-hover:bg-accent-strong" : "bg-white/[0.07]")}
                style={{ height: bucket.earnedCents > 0 ? `${Math.max(3, height)}%` : "2px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] tabular-nums text-ink-muted">
        <span>{trend[0]?.label}</span>
        <span>{trend[trend.length - 1]?.label}</span>
      </div>
    </Panel>
  );
}

/** Horizontal bars, value at the tip - the form for magnitude across a handful of names. */
function TopServices({ data }: { data: BusinessInsights }) {
  const { services, currency } = data;
  const top = services.slice(0, 5);
  const peak = Math.max(...top.map((s) => s.earnedCents), 1);

  return (
    <Panel title="What pays best" caption={services.length === 0 ? undefined : `${services.length} service${services.length === 1 ? "" : "s"} booked this period`}>
      {top.length === 0 ? (
        <p className="text-[13px] text-ink-muted">No appointments in this period yet.</p>
      ) : (
        <ul className="space-y-3">
          {top.map((s) => (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate font-medium">{s.name}</span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {formatMoney(s.earnedCents, currency)} · {s.appointments}×
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-r-[4px] bg-accent" style={{ width: `${Math.max(2, (s.earnedCents / peak) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Regulars({ data }: { data: BusinessInsights }) {
  const { clients, currency, timezone } = data;
  return (
    <Panel title="Your best clients" caption="By spend in this period">
      {clients.length === 0 ? (
        <p className="text-[13px] text-ink-muted">No clients in this period yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{c.name}</p>
                <p className="text-[12px] text-ink-muted">
                  {c.appointments} visit{c.appointments === 1 ? "" : "s"} · last {formatInTimeZone(new Date(c.lastAt), timezone, "d MMM")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.returning && (
                  <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-strong">Regular</span>
                )}
                <span className="text-[13px] font-semibold tabular-nums">{formatMoney(c.earnedCents, currency)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Columns with emphasis: the busiest day is the story, so the rest recede. */
function BusiestDays({ data }: { data: BusinessInsights }) {
  const { weekdays, currency } = data;
  const peak = Math.max(...weekdays.map((d) => d.appointments), 0);

  return (
    <Panel title="Busiest days" caption="Appointments by day of the week">
      <div className="flex h-28 items-end gap-1.5" role="list">
        {weekdays.map((d) => {
          const closed = d.openMinutes === 0;
          const label = closed
            ? `${d.label}: closed`
            : `${d.label}: ${d.appointments} appointment${d.appointments === 1 ? "" : "s"}, ${formatMoney(d.earnedCents, currency)}`;
          return (
            <div key={d.day} role="listitem" tabIndex={0} aria-label={label} className="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none">
              <span className="pointer-events-none absolute inset-x-0 bottom-full z-10 mx-auto mb-1 w-max rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink hidden shadow-pop group-hover:block group-focus-visible:block">
                {label}
              </span>
              <div
                className={cn(
                  "mx-auto w-full max-w-6 rounded-t-[4px]",
                  d.appointments === 0 ? "bg-white/[0.07]" : d.appointments === peak ? "bg-accent" : "bg-white/20",
                )}
                style={{ height: peak > 0 && d.appointments > 0 ? `${Math.max(6, (d.appointments / peak) * 100)}%` : "2px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-center text-[11px] text-ink-muted">
        {weekdays.map((d) => (
          <span key={d.day} className={cn("flex-1", d.openMinutes === 0 && "opacity-40")}>
            {d.label[0]}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function BusiestTimes({ data }: { data: BusinessInsights }) {
  const { hours } = data;
  const peak = Math.max(...hours.map((h) => h.appointments), 0);
  const step = hours.length > 8 ? 3 : 2;

  return (
    <Panel title="Busiest times" caption="When your appointments start">
      <div className="flex h-28 items-end gap-[2px]" role="list">
        {hours.map((h) => {
          const label = `${h.label}: ${h.appointments} appointment${h.appointments === 1 ? "" : "s"}`;
          return (
            <div key={h.hour} role="listitem" tabIndex={0} aria-label={label} className="group relative flex h-full flex-1 cursor-default flex-col justify-end outline-none">
              <span className="pointer-events-none absolute inset-x-0 bottom-full z-10 mx-auto mb-1 w-max rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink hidden shadow-pop group-hover:block group-focus-visible:block">
                {label}
              </span>
              <div
                className={cn("mx-auto w-full max-w-6 rounded-t-[4px]", h.appointments > 0 ? "bg-accent" : "bg-white/[0.07]")}
                style={{ height: peak > 0 && h.appointments > 0 ? `${Math.max(6, (h.appointments / peak) * 100)}%` : "2px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[2px] text-center text-[11px] text-ink-muted">
        {hours.map((h, i) => (
          <span key={h.hour} className="flex-1 truncate">
            {i % step === 0 ? h.label : ""}
          </span>
        ))}
      </div>
    </Panel>
  );
}

/* ───────────────────────── Empty ───────────────────────── */

function EmptyState({ days }: { days: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key="empty" variants={fadeVariants} initial="hidden" animate="visible" className="glass rounded-3xl p-8 text-center">
        <p className="text-[15px] font-semibold">Nothing booked in the last {days} days</p>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-ink-muted">
          As soon as clients start booking, this page fills in: what you earned, which services pay best, who comes back and how much of your open time is
          actually sold.
        </p>
        <Link
          href="/dashboard/page"
          className="mt-4 inline-flex h-10 items-center rounded-2xl bg-accent px-5 text-[13px] font-semibold text-black transition-colors hover:bg-accent-strong"
        >
          Share your booking page
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
