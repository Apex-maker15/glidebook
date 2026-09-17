"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { fadeVariants, spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import { cn } from "@/lib/utils";
import type { AvailabilityDTO, AvailabilitySlots, TimeWindow } from "@/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_WINDOW: TimeWindow = { start: "09:00", end: "17:00" };
const DEFAULT_BREAK: TimeWindow = { start: "12:00", end: "12:30" };

type Week = Record<number, AvailabilitySlots | null>;

export interface ManagerProps {
  /** Admins may manage another provider's data. */
  providerId?: string;
  /** Hide the page header when rendered inside another screen. */
  embedded?: boolean;
}

function scoped(path: string, providerId?: string) {
  if (!providerId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}providerId=${encodeURIComponent(providerId)}`;
}

function toWeek(days: AvailabilityDTO[]): Week {
  const week: Week = {};
  for (let d = 0; d < 7; d++) week[d] = null;
  for (const day of days) week[day.dayOfWeek] = day.slots;
  return week;
}

export function AvailabilityEditor({ providerId, embedded }: ManagerProps = {}) {
  const [week, setWeek] = useState<Week | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    api<{ days: AvailabilityDTO[] }>(scoped("/api/availability", providerId))
      .then((r) => setWeek(toWeek(r.days)))
      .catch((e) => setError(errorMessage(e)));
  }, [providerId]);

  const update = (day: number, fn: (slots: AvailabilitySlots | null) => AvailabilitySlots | null) => {
    setWeek((w) => (w ? { ...w, [day]: fn(w[day]) } : w));
    setDirty(true);
  };

  const save = async () => {
    if (!week) return;
    setSaving(true);
    try {
      const days = Object.entries(week)
        .filter(([, slots]) => slots && slots.windows.length > 0)
        .map(([d, slots]) => ({ dayOfWeek: Number(d), slots: slots! }));
      const res = await api<{ days: AvailabilityDTO[] }>(scoped("/api/availability", providerId), { method: "PUT", body: { days } });
      setWeek(toWeek(res.days));
      setDirty(false);
      push({ tone: "success", title: "Availability saved", description: "New slots are live on your booking page." });
    } catch (err) {
      push({ tone: "error", title: "Could not save", description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          {!embedded && <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Weekly hours</p>}
          <h1 className={embedded ? "text-lg font-semibold" : "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"}>Availability</h1>
        </div>
        <AnimatePresence>
          {dirty && (
            <motion.div key="save" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring.snappy}>
              <Button onClick={() => void save()} loading={saving}>
                Save changes
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!week && !error ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
            {DAYS.map((d) => (
              <Skeleton key={d} className="h-16 rounded-2xl" />
            ))}
          </motion.div>
        ) : error ? (
          <motion.p key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="text-sm text-red-300">
            {error}
          </motion.p>
        ) : (
          <motion.div key="editor" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3">
            {DAYS.map((name, day) => {
              const slots = week![day];
              const enabled = Boolean(slots && slots.windows.length > 0);
              return (
                <motion.section key={name} layout transition={spring.soft} className={cn("glass rounded-2xl p-4", !enabled && "opacity-80")}>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-3">
                      <Switch
                        checked={enabled}
                        onChange={(on) => update(day, () => (on ? { windows: [DEFAULT_WINDOW], breaks: [] } : null))}
                      />
                      <span className="w-24 text-sm font-semibold">{name}</span>
                    </label>
                    {enabled && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => update(day, (s) => s && { ...s, windows: [...s.windows, { start: "18:00", end: "20:00" }] })}>
                          <Plus className="size-3.5" /> Window
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => update(day, (s) => s && { ...s, breaks: [...s.breaks, DEFAULT_BREAK] })}>
                          <Coffee className="size-3.5" /> Break
                        </Button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {enabled && (
                      <motion.div
                        key="rows"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ ...spring.soft, opacity: { duration: 0.2 } }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 border-t border-white/[0.08] pt-3">
                          {slots!.windows.map((w, i) => (
                            <TimeRow
                              key={`w-${i}`}
                              label="Working"
                              value={w}
                              onChange={(v) => update(day, (s) => s && { ...s, windows: s.windows.map((x, j) => (j === i ? v : x)) })}
                              onRemove={slots!.windows.length > 1 ? () => update(day, (s) => s && { ...s, windows: s.windows.filter((_, j) => j !== i) }) : undefined}
                            />
                          ))}
                          {slots!.breaks.map((b, i) => (
                            <TimeRow
                              key={`b-${i}`}
                              label="Break"
                              muted
                              value={b}
                              onChange={(v) => update(day, (s) => s && { ...s, breaks: s.breaks.map((x, j) => (j === i ? v : x)) })}
                              onRemove={() => update(day, (s) => s && { ...s, breaks: s.breaks.filter((_, j) => j !== i) })}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeRow({ label, value, onChange, onRemove, muted }: { label: string; value: TimeWindow; onChange: (v: TimeWindow) => void; onRemove?: () => void; muted?: boolean }) {
  const input = "h-9 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-sm tabular-nums outline-none focus:border-accent/60 [color-scheme:dark]";
  return (
    <motion.div layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={spring.snappy} className="flex items-center gap-2">
      <span className={cn("w-16 text-[12px] font-medium", muted ? "text-ink-muted" : "text-ink")}>{label}</span>
      <input type="time" className={input} value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} required />
      <span className="text-ink-muted">-</span>
      <input type="time" className={input} value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} required />
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="ml-auto rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-500/15 hover:text-red-300">
          <Trash2 className="size-3.5" />
        </button>
      )}
    </motion.div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300", checked ? "bg-accent" : "bg-white/[0.12]")}
    >
      <motion.span
        layout
        transition={spring.snappy}
        className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow", checked ? "left-[22px]" : "left-0.5")}
      />
    </button>
  );
}
