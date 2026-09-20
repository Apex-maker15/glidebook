"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Field, Skeleton } from "@/components/ui/primitives";
import { fadeVariants } from "@/components/motion";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import type { ProviderAccountDTO } from "@/types";
import { CURRENCIES } from "@/lib/categories";
import { COUNTRIES } from "@/lib/platform";

interface FormState {
  businessName: string;
  email: string;
  phone: string;
  timezone: string;
  currency: string;
  country: string;
  stripeConnected: boolean;
  locationMode: "STUDIO" | "MOBILE";
  studioAddress: string;
  serviceAreas: string;
  serviceAreaCodes: string;
  depositPercent: string;
  cancelNoticeHours: string;
  slotIntervalMinutes: string;
  bufferMinutes: string;
  minNoticeMinutes: string;
  bookingHorizonDays: string;
}

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

export function SettingsForm({ providerId, embedded }: ManagerProps = {}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    api<{ provider: ProviderAccountDTO }>(scoped("/api/settings", providerId))
      .then(({ provider }) =>
        setForm({
          businessName: provider.businessName,
          email: provider.email,
          phone: provider.phone ?? "",
          timezone: provider.timezone,
          currency: provider.currency,
          country: provider.country,
          stripeConnected: provider.stripeConnected,
          locationMode: provider.locationMode,
          studioAddress: provider.studioAddress ?? "",
          serviceAreas: provider.serviceAreas ?? "",
          serviceAreaCodes: provider.serviceAreaCodes ?? "",
          depositPercent: String(provider.depositPercent),
          cancelNoticeHours: String(provider.cancelNoticeHours),
          slotIntervalMinutes: String(provider.slotIntervalMinutes),
          bufferMinutes: String(provider.bufferMinutes),
          minNoticeMinutes: String(provider.minNoticeMinutes),
          bookingHorizonDays: String(provider.bookingHorizonDays),
        }),
      )
      .catch((e) => setError(errorMessage(e)));
  }, [providerId]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => f && { ...f, [k]: e.target.value });
  const selectCls =
    "h-12 w-full rounded-2xl border border-line bg-white/[0.04] px-4 text-[15px] text-ink outline-none focus:border-accent/60 [color-scheme:dark]";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setIssues({});
    try {
      await api(scoped("/api/settings", providerId), {
        method: "PATCH",
        body: {
          businessName: form.businessName,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          timezone: form.timezone,
          currency: form.currency,
          country: form.country,
          locationMode: form.locationMode,
          studioAddress: form.studioAddress.trim() || null,
          serviceAreas: form.serviceAreas.trim() || null,
          serviceAreaCodes: form.serviceAreaCodes.trim() || null,
          depositPercent: Number(form.depositPercent),
          cancelNoticeHours: Number(form.cancelNoticeHours),
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
        {!embedded && <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Business</p>}
        <h1 className={embedded ? "text-lg font-semibold" : "mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"}>Settings</h1>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Login email" type="email" value={form!.email} onChange={set("email")} error={issues.email?.[0]} hint="Booking alerts go here too" required />
              <Field label="Phone (shown to clients after booking)" type="tel" value={form!.phone} onChange={set("phone")} error={issues.phone?.[0]} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Timezone" value={form!.timezone} onChange={set("timezone")} error={issues.timezone?.[0]} hint="e.g. Europe/London" required />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currency" className="text-[13px] font-medium text-ink-muted">
                  Currency
                </label>
                <select id="currency" value={form!.currency} onChange={set("currency")} className={selectCls}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted/80">Applies to all your services</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="country" className="text-[13px] font-medium text-ink-muted">
                Country
              </label>
              <select id="country" value={form!.country} onChange={set("country")} className={selectCls} disabled={form!.stripeConnected}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-muted/80">
                {form!.stripeConnected ? "Locked: your Stripe account is registered here." : "Where your business is registered. Used when you connect Stripe for payouts."}
              </p>
              {issues.country?.[0] && <p className="text-xs text-red-300">{issues.country[0]}</p>}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-[13px] font-medium text-ink-muted">Where do appointments happen?</p>
              <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup">
                {(
                  [
                    { value: "STUDIO", label: "Clients come to me", hint: "Home studio, salon chair" },
                    { value: "MOBILE", label: "I travel to clients", hint: "Address collected at booking" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={form!.locationMode === opt.value}
                    onClick={() => setForm((f) => f && { ...f, locationMode: opt.value })}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      form!.locationMode === opt.value ? "border-accent/60 bg-accent-soft" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[12px] text-ink-muted">{opt.hint}</p>
                  </button>
                ))}
              </div>
              {form!.locationMode === "STUDIO" && (
                <Field
                  className="mt-3"
                  label="Studio address"
                  value={form!.studioAddress}
                  onChange={set("studioAddress")}
                  error={issues.studioAddress?.[0]}
                  hint="Shown to clients after they book"
                  placeholder="12 High Street, Croydon, CR0 1AA"
                />
              )}
              {form!.locationMode === "MOBILE" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Areas you cover"
                    value={form!.serviceAreas}
                    onChange={set("serviceAreas")}
                    error={issues.serviceAreas?.[0]}
                    hint="Shown on your booking page"
                    placeholder={form!.country === "US" ? "Phoenix, Scottsdale, Tempe, Mesa" : "Croydon, Sutton, Bromley"}
                  />
                  <Field
                    label={form!.country === "US" ? "ZIP prefixes you accept (optional)" : "Postcode prefixes you accept (optional)"}
                    value={form!.serviceAreaCodes}
                    onChange={set("serviceAreaCodes")}
                    error={issues.serviceAreaCodes?.[0]}
                    hint="Comma-separated. Clients outside these cannot book; leave blank to accept anywhere."
                    placeholder={form!.country === "US" ? "850, 852, 853" : "CR, SM, BR"}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Deposit (% of service price)"
                type="number"
                min={10}
                max={100}
                step={5}
                value={form!.depositPercent}
                onChange={set("depositPercent")}
                error={issues.depositPercent?.[0]}
                hint="100 = full payment upfront. 30 is typical for nails and lashes."
              />
              <Field
                label="Free cancellation up to (hours before)"
                type="number"
                min={0}
                max={168}
                step={1}
                value={form!.cancelNoticeHours}
                onChange={set("cancelNoticeHours")}
                error={issues.cancelNoticeHours?.[0]}
                hint="Clients cancelling with more notice than this are refunded automatically."
              />
            </div>
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
