"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion";

export interface CalendarProps {
  /** Selected date "YYYY-MM-DD" */
  value: string | null;
  onChange: (date: string) => void;
  /** Earliest selectable date (inclusive), "YYYY-MM-DD" */
  min: string;
  /** Latest selectable date (inclusive), "YYYY-MM-DD" */
  max: string;
  /** Map of "YYYY-MM-DD" -> has at least one open slot; undefined = unknown (loading) */
  availability: Record<string, boolean | undefined>;
  onMonthChange?: (month: string) => void;
  loadingMonth?: boolean;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthOf(date: string) {
  return date.slice(0, 7);
}

function addMonths(month: string, delta: number) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function buildGrid(month: string): (string | null)[] {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  const first = new Date(Date.UTC(y, m, 1));
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function Calendar({ value, onChange, min, max, availability, onMonthChange, loadingMonth }: CalendarProps) {
  const [month, setMonth] = useState(() => monthOf(value ?? min));
  const [dir, setDir] = useState<1 | -1>(1);

  const cells = useMemo(() => buildGrid(month), [month]);
  const canPrev = month > monthOf(min);
  const canNext = month < monthOf(max);

  const go = (delta: 1 | -1) => {
    const next = addMonths(month, delta);
    setDir(delta);
    setMonth(next);
    onMonthChange?.(next);
  };

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-white/[0.08] hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="relative h-6 overflow-hidden text-center">
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.span
              key={month}
              custom={dir}
              initial={{ y: dir * 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: dir * -14, opacity: 0 }}
              transition={spring.snappy}
              className="block text-sm font-semibold"
            >
              {MONTHS[Number(month.slice(5, 7)) - 1]} {month.slice(0, 4)}
            </motion.span>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-white/[0.08] hover:text-ink disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wider text-ink-muted/70">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={month}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={spring.soft}
            className="grid grid-cols-7 gap-y-1"
            role="grid"
          >
            {cells.map((date, i) => {
              if (!date) return <span key={`empty-${i}`} aria-hidden />;
              const inRange = date >= min && date <= max;
              const known = availability[date];
              const open = inRange && known === true;
              const unknown = inRange && known === undefined;
              const selected = date === value;
              const disabled = !open;
              return (
                <div key={date} className="flex justify-center py-0.5">
                  <motion.button
                    type="button"
                    role="gridcell"
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => onChange(date)}
                    whileHover={disabled ? undefined : { scale: 1.08 }}
                    whileTap={disabled ? undefined : { scale: 0.94 }}
                    transition={spring.snappy}
                    className={cn(
                      "relative flex size-10 items-center justify-center rounded-full text-sm outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent/70",
                      selected ? "font-semibold text-black" : open ? "text-ink hover:bg-white/[0.08]" : "text-ink-muted/35",
                      unknown && loadingMonth && "animate-pulse",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="calendar-selected"
                        transition={spring.morph}
                        className="absolute inset-0 rounded-full bg-accent shadow-[0_8px_24px_-8px_var(--accent)]"
                      />
                    )}
                    <span className="relative">{Number(date.slice(8, 10))}</span>
                    {open && !selected && (
                      <span className="absolute bottom-1 size-1 rounded-full bg-accent/80" aria-hidden />
                    )}
                  </motion.button>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
