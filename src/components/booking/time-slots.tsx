"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsClockwise, CalendarX } from "@/components/icons";
import { cn } from "@/lib/utils";
import { fadeVariants, spring } from "@/components/motion";
import { Skeleton } from "@/components/ui/primitives";
import type { SlotDTO } from "@/types";

interface Props {
  slots: SlotDTO[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  selected: SlotDTO | null;
  onSelect: (slot: SlotDTO) => void;
  onRetry: () => void;
  hasDate: boolean;
}

function periodOf(label: string): "Morning" | "Afternoon" | "Evening" {
  const [time, meridiem] = label.split(" ");
  let hour = Number(time.split(":")[0]);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function TimeSlots({ slots, status, error, selected, onSelect, onRetry, hasDate }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, SlotDTO[]>();
    for (const s of slots) {
      const key = periodOf(s.label);
      (map.get(key) ?? map.set(key, []).get(key)!).push(s);
    }
    return [...map.entries()];
  }, [slots]);

  return (
    <div className="relative min-h-[280px]">
      <AnimatePresence mode="wait" initial={false}>
        {!hasDate ? (
          <motion.div key="empty" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-ink-muted">
            Pick a day to see open times
          </motion.div>
        ) : status === "loading" || status === "idle" ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5" aria-busy>
            {[4, 6, 3].map((n, gi) => (
              <div key={gi}>
                <Skeleton className="mb-2.5 h-3 w-20" />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: n }).map((_, i) => (
                    <Skeleton key={i} className="h-11 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : status === "error" ? (
          <motion.div key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-bad">{error}</p>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
              <ArrowsClockwise className="size-3.5" /> Try again
            </button>
          </motion.div>
        ) : slots.length === 0 ? (
          <motion.div key="none" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-ink-muted">
            <CalendarX className="size-6 text-ink-muted/60" />
            Fully booked that day. Try another date.
          </motion.div>
        ) : (
          <motion.div key="slots" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
            {groups.map(([period, items]) => (
              <div key={period}>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted/80">{period}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={`${period} times`}>
                  {items.map((slot) => {
                    const active = selected?.start === slot.start;
                    return (
                      <motion.button
                        key={slot.start}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onSelect(slot)}
                        whileTap={{ scale: 0.95 }}
                        transition={spring.snappy}
                        className={cn(
                          "relative h-11 rounded-xl border text-sm font-medium tabular-nums outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent/70",
                          active ? "border-transparent text-black" : "border-white/[0.08] bg-white/[0.03] text-ink hover:bg-white/[0.07]",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="slot-active"
                            transition={spring.morph}
                            className="absolute inset-0 rounded-xl bg-accent"
                          />
                        )}
                        <span className="relative">{slot.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
