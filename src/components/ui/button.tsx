"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { CircleNotch } from "@/components/icons";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-black font-semibold hover:bg-accent-strong",
  secondary: "glass text-ink hover:bg-white/10",
  ghost: "text-ink-muted hover:text-ink hover:bg-white/5",
  danger: "bg-bad/15 text-bad border border-bad/25 hover:bg-bad/25",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-lg gap-2",
  lg: "h-[52px] px-7 text-[15px] rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.97, y: 0 }}
      transition={spring.snappy}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex select-none items-center justify-center whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <CircleNotch className="size-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});
