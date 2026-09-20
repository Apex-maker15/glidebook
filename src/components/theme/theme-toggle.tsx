"use client";

import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion";
import { useTheme } from "./use-theme";

/** Sun/moon switch. Persists the choice and updates the whole document instantly. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-8 w-[60px] shrink-0 items-center rounded-full border border-line bg-white/[0.06] p-1 text-ink-muted transition-colors hover:text-ink",
        className,
      )}
    >
      <Sun className="absolute left-2 size-3.5" aria-hidden />
      <Moon className="absolute right-2 size-3.5" aria-hidden />
      <motion.span
        layout
        transition={spring.snappy}
        className="relative z-10 flex size-6 items-center justify-center rounded-full bg-surface text-ink shadow-card"
        style={{ marginLeft: dark ? "auto" : 0 }}
      >
        {dark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      </motion.span>
    </button>
  );
}
