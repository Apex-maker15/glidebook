"use client";

import { forwardRef, useId } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
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
        "animate-pulse rounded-lg bg-white/[0.06]",
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
          error && "border-bad/60 focus:border-bad/70 focus:shadow-[0_0_0_4px_rgb(239_68_68/0.15)]",
        )}
        {...props}
      />
      {error ? (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-bad">
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
          error && "border-bad/60",
        )}
        {...props}
      />
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
});

/* ───────────────────────── Status badge ───────────────────────── */

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "bg-warn/15 text-warn border-warn/25",
  CONFIRMED: "bg-info/15 text-info border-info/25",
  PAID: "bg-ok/15 text-ok border-ok/25",
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
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
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
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">{children}</kbd>;
}
