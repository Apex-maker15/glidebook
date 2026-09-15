"use client";

import { forwardRef, useId } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion";
import type { BookingStatus } from "@/types";

/* ───────────────────────── Glass card ───────────────────────── */

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  strong?: boolean;
  interactive?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { strong, interactive, className, ...props },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -2 } : undefined}
      transition={spring.soft}
      className={cn(strong ? "glass-strong" : "glass", "rounded-3xl", interactive && "cursor-pointer", className)}
      {...props}
    />
  );
});

/* ───────────────────────── Skeleton ───────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.06] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.07] before:to-transparent",
        className,
      )}
    >
    </div>
  );
}

/* ───────────────────────── Inputs ───────────────────────── */

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-[13px] font-medium text-ink-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-12 w-full rounded-2xl border bg-white/[0.04] px-4 text-[15px] text-ink placeholder:text-ink-muted/60 outline-none transition-[border-color,box-shadow,background-color] duration-300",
          "border-line focus:border-accent/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_var(--accent-soft)]",
          error && "border-red-500/60 focus:border-red-500/70 focus:shadow-[0_0_0_4px_rgb(239_68_68/0.15)]",
        )}
        {...props}
      />
      {error ? (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-300">
          {error}
        </motion.p>
      ) : hint ? (
        <p className="text-xs text-ink-muted/80">{hint}</p>
      ) : null}
    </div>
  );
});

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ label, error, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-[13px] font-medium text-ink-muted">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-24 w-full resize-y rounded-2xl border border-line bg-white/[0.04] px-4 py-3 text-[15px] text-ink placeholder:text-ink-muted/60 outline-none transition-[border-color,box-shadow,background-color] duration-300 focus:border-accent/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_var(--accent-soft)]",
          error && "border-red-500/60",
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
});

/* ───────────────────────── Status badge ───────────────────────── */

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-amber-400/15 text-amber-200 border-amber-400/25",
  CONFIRMED: "bg-sky-400/15 text-sky-200 border-sky-400/25",
  PAID: "bg-emerald-400/15 text-emerald-200 border-emerald-400/25",
  CANCELLED: "bg-white/[0.06] text-ink-muted border-white/10",
};

export const statusLabel: Record<BookingStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        statusStyles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel[status]}
    </span>
  );
}

/* ───────────────────────── Misc ───────────────────────── */

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent", className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">{children}</kbd>;
}
