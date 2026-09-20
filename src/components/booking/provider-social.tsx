"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Star, X } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { spring } from "@/components/motion";
import type { ReviewSummary } from "@/types";

export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-accent text-accent" : "text-ink-muted/40"}`} />
      ))}
    </span>
  );
}

/** Photos of the provider's work: a tight grid with a simple lightbox. */
export function Gallery({ photos, businessName }: { photos: string[]; businessName: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
      <h2 className="mb-3 flex items-center gap-2 px-2 text-sm font-semibold sm:px-5">
        <Camera className="size-4 text-accent-strong" /> Recent work
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-2"
            aria-label={`Open photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
            <img src={src} alt={`${businessName} work ${i + 1}`} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          </button>
        ))}
      </div>
      <AnimatePresence>
        {open !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            style={{ backgroundColor: "rgb(0 0 0 / 0.82)" }}
            onClick={() => setOpen(null)}
          >
            <motion.img
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={spring.soft}
              src={photos[open]}
              alt=""
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-pop"
              onClick={(e) => e.stopPropagation()}
            />
            <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:text-white" style={{ color: "#fff" }}>
              <X className="size-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Average rating and the latest reviews, placed right next to the booking form. */
export function Reviews({ summary }: { summary: ReviewSummary }) {
  if (summary.count === 0) return null;
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
      <div className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Star className="size-4 fill-accent text-accent" /> What clients say
          </h2>
          <p className="flex items-center gap-2 text-sm">
            <span className="text-2xl font-semibold tabular-nums">{summary.average?.toFixed(1)}</span>
            <Stars value={summary.average ?? 0} />
            <span className="text-ink-muted">
              · {summary.count} review{summary.count === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {summary.latest.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <Stars value={r.rating} size="size-3.5" />
                <span className="text-[12px] text-ink-muted">{formatDistanceToNowStrict(new Date(r.createdAt))} ago</span>
              </div>
              {r.text && <p className="mt-2 text-[14px] leading-relaxed">{r.text}</p>}
              <p className="mt-2 text-[12px] font-medium text-ink-muted">{r.clientName}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
