"use client";

import { useMemo } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarDays, Columns3, Inbox, List, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/primitives";
import { fadeVariants, spring } from "@/components/motion";
import { sortBookings, useDashboardStore, type Connection, type StatusFilter } from "@/store/dashboard-store";
import { useRealtimeBookings } from "./use-realtime";
import { BookingCard } from "./booking-card";
import { cn, formatMoney } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import type { BookingDTO, BookingStatus } from "@/types";

const COLUMNS: { status: BookingStatus; title: string; hint: string }[] = [
  { status: "PENDING", title: "Awaiting payment", hint: "Slot is held for 15 minutes" },
  { status: "PAID", title: "Paid", hint: "Ready to go" },
  { status: "CONFIRMED", title: "Confirmed", hint: "Pay on the day" },
];

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function BookingBoard({ timezone, currency }: { timezone: string; currency: string }) {
  useRealtimeBookings();

  const bookingMap = useDashboardStore((s) => s.bookings);
  const bookings = useMemo(() => sortBookings(bookingMap), [bookingMap]);
  const status = useDashboardStore((s) => s.status);
  const error = useDashboardStore((s) => s.error);
  const highlighted = useDashboardStore((s) => s.highlighted);
  const connection = useDashboardStore((s) => s.connection);
  const view = useDashboardStore((s) => s.view);
  const filter = useDashboardStore((s) => s.filter);
  const setView = useDashboardStore((s) => s.setView);
  const setFilter = useDashboardStore((s) => s.setFilter);
  const load = useDashboardStore((s) => s.load);

  const now = useNow(60_000);
  const upcoming = useMemo(() => bookings.filter((b) => new Date(b.endTime).getTime() >= now), [bookings, now]);

  const stats = useMemo(() => {
    const todayKey = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    const today = bookings.filter((b) => b.status !== "CANCELLED" && formatInTimeZone(new Date(b.startTime), timezone, "yyyy-MM-dd") === todayKey);
    const weekAhead = upcoming.filter((b) => b.status !== "CANCELLED" && new Date(b.startTime).getTime() < now + 7 * 86_400_000);
    // What has actually been collected up front for the coming week (deposits, or full price for prepay providers).
    const revenue = weekAhead.filter((b) => b.status === "PAID").reduce((sum, b) => sum + b.depositCents, 0);
    return { today: today.length, week: weekAhead.length, revenue, pending: upcoming.filter((b) => b.status === "PENDING").length };
  }, [bookings, upcoming, now, timezone]);

  const listItems = useMemo(() => {
    const source = filter === "ALL" ? bookings.filter((b) => b.status !== "CANCELLED") : bookings.filter((b) => b.status === filter);
    const groups = new Map<string, BookingDTO[]>();
    for (const b of source) {
      const key = formatInTimeZone(new Date(b.startTime), timezone, "yyyy-MM-dd");
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(b);
    }
    return [...groups.entries()];
  }, [bookings, filter, timezone]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today" value={String(stats.today)} loading={status === "loading"} />
        <Stat label="Next 7 days" value={String(stats.week)} loading={status === "loading"} />
        <Stat label="Collected this week" value={formatMoney(stats.revenue, currency)} loading={status === "loading"} />
        <Stat label="Awaiting payment" value={String(stats.pending)} loading={status === "loading"} accent={stats.pending > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="glass flex rounded-xl p-1">
          <ToggleButton active={view === "board"} onClick={() => setView("board")} icon={<Columns3 className="size-4" />} label="Board" id="view-board" />
          <ToggleButton active={view === "list"} onClick={() => setView("list")} icon={<List className="size-4" />} label="List" id="view-list" />
        </div>
        <AnimatePresence initial={false}>
          {view === "list" && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={spring.snappy}
              className="glass flex rounded-xl p-1"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                    filter === f.value ? "text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {filter === f.value && <motion.span layoutId="filter-active" transition={spring.morph} className="absolute inset-0 rounded-lg bg-white/10" />}
                  <span className="relative">{f.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-2">
          <ConnectionPill connection={connection} />
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh"
            className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-white/[0.08] hover:text-ink"
          >
            <RefreshCw className={cn("size-4", status === "loading" && "animate-spin")} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {status === "loading" || status === "idle" ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy>
            {[3, 2, 2].map((n, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: n }).map((_, j) => (
                  <Skeleton key={j} className="h-36 rounded-2xl" />
                ))}
              </div>
            ))}
          </motion.div>
        ) : status === "error" ? (
          <motion.div key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="glass rounded-3xl p-10 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-3 text-sm text-ink-muted hover:text-ink">
              Try again
            </button>
          </motion.div>
        ) : view === "board" ? (
          <motion.div key="board" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
            <LayoutGroup id="board">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {COLUMNS.map((col) => {
                  const items = upcoming.filter((b) => b.status === col.status);
                  return (
                    <section key={col.status} className="min-w-0">
                      <header className="mb-3 flex items-baseline justify-between px-1">
                        <div>
                          <h2 className="text-sm font-semibold">{col.title}</h2>
                          <p className="text-[12px] text-ink-muted">{col.hint}</p>
                        </div>
                        <motion.span
                          key={items.length}
                          initial={{ scale: 1.3, opacity: 0.5 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={spring.snappy}
                          className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-ink-muted"
                        >
                          {items.length}
                        </motion.span>
                      </header>
                      <motion.div layout className="space-y-3">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {items.length === 0 ? (
                            <motion.div
                              key="empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/10 text-[13px] text-ink-muted"
                            >
                              <Inbox className="size-4" /> Nothing here
                            </motion.div>
                          ) : (
                            items.map((b) => <BookingCard key={b.id} booking={b} timezone={timezone} highlighted={Boolean(highlighted[b.id])} />)
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </section>
                  );
                })}
              </div>
            </LayoutGroup>
          </motion.div>
        ) : (
          <motion.div key="list" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
            <LayoutGroup id="list">
              <AnimatePresence mode="popLayout" initial={false}>
                {listItems.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-40 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 text-sm text-ink-muted"
                  >
                    <CalendarDays className="size-5" /> No bookings match this filter
                  </motion.div>
                ) : (
                  listItems.map(([day, items]) => (
                    <motion.section key={day} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h2 className="mb-3 px-1 text-sm font-semibold">
                        {formatInTimeZone(new Date(`${day}T12:00:00Z`), "UTC", "EEEE, MMMM d")}
                        <span className="ml-2 text-[12px] font-normal text-ink-muted">{items.length}</span>
                      </h2>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {items.map((b) => (
                            <BookingCard key={b.id} booking={b} timezone={timezone} highlighted={Boolean(highlighted[b.id])} compact />
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.section>
                  ))
                )}
              </AnimatePresence>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, loading, accent }: { label: string; value: string; loading: boolean; accent?: boolean }) {
  return (
    <div className={cn("glass rounded-2xl p-4", accent && "ring-1 ring-amber-400/30")}>
      <p className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">{label}</p>
      <div className="mt-1.5 h-7">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div key="s" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <Skeleton className="h-6 w-16" />
            </motion.div>
          ) : (
            <motion.p key={value} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy} className="text-xl font-semibold tabular-nums tracking-tight">
              {value}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToggleButton({ active, onClick, icon, label, id }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; id: string }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      aria-pressed={active}
      className={cn("relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors", active ? "text-ink" : "text-ink-muted hover:text-ink")}
    >
      {active && <motion.span layoutId="view-active" transition={spring.morph} className="absolute inset-0 rounded-lg bg-white/10" />}
      <span className="relative flex items-center gap-1.5">
        {icon} {label}
      </span>
    </button>
  );
}

function ConnectionPill({ connection }: { connection: Connection }) {
  const map: Record<Connection, { label: string; cls: string; icon: React.ReactNode }> = {
    live: { label: "Live", cls: "text-emerald-300", icon: <Wifi className="size-3.5" /> },
    connecting: { label: "Connecting", cls: "text-ink-muted", icon: <Wifi className="size-3.5 animate-pulse" /> },
    polling: { label: "Syncing every 15s", cls: "text-amber-200", icon: <RefreshCw className="size-3.5" /> },
    offline: { label: "Offline", cls: "text-red-300", icon: <WifiOff className="size-3.5" /> },
  };
  const c = map[connection];
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium", c.cls)}>
      {connection === "live" && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
      )}
      {connection !== "live" && c.icon}
      {c.label}
    </span>
  );
}
