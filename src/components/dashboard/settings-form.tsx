"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Field, Skeleton } from "@/components/ui/primitives";
import { fadeVariants } from "@/components/motion";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import type { ProviderDTO } from "@/types";

interface FormState {
  businessName: string;
  timezone: string;
  slotIntervalMinutes: string;
  bufferMinutes: string;
  minNoticeMinutes: string;
  bookingHorizonDays: string;
}

export function SettingsForm() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    api<{ provider: ProviderDTO }>("/api/settings")
      .then(({ provider }) =>
        setForm({
          businessName: provider.businessName,
          timezone: provider.timezone,
          slotIntervalMinutes: String(provider.slotIntervalMinutes),
          bufferMinutes: String(provider.bufferMinutes),
          minNoticeMinutes: String(provider.minNoticeMinutes),
          bookingHorizonDays: String(provider.bookingHorizonDays),
        }),
      )
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => f && { ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setIssues({});
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: {
          businessName: form.businessName,
          timezone: form.timezone,
          slotIntervalMinutes: Number(form.slotIntervalMinutes),
          bufferMinutes: Number(form.bufferMinutes),
          minNoticeMinutes: Number(form.minNoticeMinutes),
          bookingHorizonDays: Number(form.bookingHorizonDays),
        },
      });
      push({ tone: "success", title: "Settings saved" });
    } catch (err) {
      if (err instanceof ClientApiError && err.issues) setIssues(err.issues);
      push({ tone: "error", title: "Could not save", description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {!form && !error ? (
          <motion.div key="skeleton" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-2xl" />
            ))}
          </motion.div>
        ) : error ? (
          <motion.p key="error" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="text-sm text-red-300">
            {error}
          </motion.p>
        ) : (
          <motion.form key="form" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" onSubmit={(e) => void save(e)} className="glass space-y-4 rounded-3xl p-6">
            <Field label="Business name" value={form!.businessName} onChange={set("businessName")} error={issues.businessName?.[0]} required />
            <Field label="Timezone" value={form!.timezone} onChange={set("timezone")} error={issues.timezone?.[0]} hint="IANA name, e.g. America/Los_Angeles" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Slot interval (minutes)"
                type="number"
                min={5}
                max={120}
                step={5}
                value={form!.slotIntervalMinutes}
                onChange={set("slotIntervalMinutes")}
                error={issues.slotIntervalMinutes?.[0]}
                hint="How often start times are offered"
              />
              <Field
                label="Travel buffer (minutes)"
                type="number"
                min={0}
                max={180}
                step={5}
                value={form!.bufferMinutes}
                onChange={set("bufferMinutes")}
                error={issues.bufferMinutes?.[0]}
                hint="Gap enforced around every job"
              />
              <Field
                label="Minimum notice (minutes)"
                type="number"
                min={0}
                step={15}
                value={form!.minNoticeMinutes}
                onChange={set("minNoticeMinutes")}
                error={issues.minNoticeMinutes?.[0]}
                hint="Earliest a customer can book ahead"
              />
              <Field
                label="Booking horizon (days)"
                type="number"
                min={1}
                max={365}
                value={form!.bookingHorizonDays}
                onChange={set("bookingHorizonDays")}
                error={issues.bookingHorizonDays?.[0]}
                hint="How far ahead customers can book"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                Save settings
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
