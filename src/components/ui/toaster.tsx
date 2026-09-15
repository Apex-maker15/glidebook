"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type Toast } from "@/store/toast-store";
import { spring } from "@/components/motion";
import { cn } from "@/lib/utils";

const icons: Record<Toast["tone"], React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-emerald-300" />,
  error: <AlertCircle className="size-4 text-red-300" />,
  info: <Info className="size-4 text-sky-300" />,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={spring.soft}
            className={cn(
              "glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-4",
              t.tone === "error" && "border-red-500/30",
            )}
          >
            <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-ink-muted">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-lg p-1 text-ink-muted transition-colors hover:bg-white/10 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
