"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Car, PawPrint, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";
import { spring } from "@/components/motion";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import { cn } from "@/lib/utils";

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Link href="/" className="mb-8 flex items-center gap-2 self-center text-sm font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
          <Sparkles className="size-4" />
        </span>
        GlideBook
      </Link>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.soft} className="glass rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </motion.div>
      <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
    </main>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key="err"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (!res || res.error) {
      setError("Incorrect email or password");
      return;
    }
    router.replace(params.get("next") ?? "/dashboard");
    router.refresh();
  };

  return (
    <Shell
      title="Welcome back"
      subtitle="Sign in to manage your schedule."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="text-ink underline-offset-4 hover:underline">
            Create a provider account
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <ErrorBanner message={error} />
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
    </Shell>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    category: "CAR_DETAILING" as "CAR_DETAILING" | "PET_GROOMING",
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});
    try {
      await api("/api/auth/register", { method: "POST", body: form });
      const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (!res || res.error) throw new Error("Account created, but sign-in failed. Please sign in manually.");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError && err.issues) setErrors(err.issues);
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Shell
      title="Create your booking page"
      subtitle="Free to start. Stripe fees apply only when you get paid."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <ErrorBanner message={error} />

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Business type">
          {(
            [
              { value: "CAR_DETAILING", label: "Car detailing", icon: <Car className="size-4" />, accent: "car" },
              { value: "PET_GROOMING", label: "Pet grooming", icon: <PawPrint className="size-4" />, accent: "pet" },
            ] as const
          ).map((opt) => {
            const active = form.category === opt.value;
            return (
              <motion.button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                data-accent={opt.accent}
                onClick={() => setForm((f) => ({ ...f, category: opt.value }))}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
                className={cn(
                  "relative flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors",
                  active ? "border-accent/60 bg-accent-soft text-ink" : "border-white/[0.08] bg-white/[0.03] text-ink-muted hover:bg-white/[0.06]",
                )}
              >
                {active && <motion.span layoutId="category-active" transition={spring.morph} className="absolute inset-0 rounded-2xl ring-1 ring-accent/60 shadow-glow" />}
                <span className="relative flex items-center gap-2">
                  {opt.icon} {opt.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        <Field label="Business name" value={form.businessName} onChange={set("businessName")} error={errors.businessName?.[0]} required />
        <Field label="Your name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name?.[0]} required />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email?.[0]} required />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password?.[0]}
          hint="At least 8 characters"
          required
        />
        <Field label="Timezone" value={form.timezone} onChange={set("timezone")} error={errors.timezone?.[0]} hint="IANA name, e.g. America/Chicago" required />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
    </Shell>
  );
}
