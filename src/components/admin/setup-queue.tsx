"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Inbox, Mail, Phone, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { fadeVariants, spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import { CATEGORIES } from "@/lib/categories";
import { cn, formatMoney } from "@/lib/utils";
import type { BusinessCategory } from "@prisma/client";

interface QueueItem {
  id: string;
  status: "PAID" | "DONE";
  notes: string;
  feeCents: number;
  currency: string;
  paidAt: string | null;
  completedAt: string | null;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    businessName: string | null;
    slug: string | null;
    category: BusinessCategory | null;
    _count: { services: number; availability: number };
  };
}

export function SetupQueue() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"services" | "availability" | "settings">("services");
  const push = useToastStore((s) => s.push);

  const load = async () => {
    try {
      const r = await api<{ requests: QueueItem[] }>("/api/admin/setup");
      setItems(r.requests);
      setActiveId((cur) => cur ?? r.requests.find((x) => x.status === "PAID")?.id ?? r.requests[0]?.id ?? null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves, not synchronously
    void load();
  }, []);

  const setStatus = async (id: string, status: "PAID" | "DONE") => {
    const before = items;
    setItems((list) => (list ?? []).map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await api(`/api/admin/setup/${id}`, { method: "PATCH", body: { status } });
      push({ tone: "success", title: status === "DONE" ? "Marked done" : "Reopened" });
    } catch (err) {
      setItems(before);
      push({ tone: "error", title: "Could not update", description: errorMessage(err) });
    }
  };

  const active = items?.find((x) => x.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Done-for-you setups</h1>
      </header>

      {error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : items === null ? (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-white/10 text-sm text-ink-muted">
          <Inbox className="size-5" /> No paid setup requests yet
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "glass w-full rounded-2xl p-4 text-left transition-colors",
                  activeId === item.id ? "ring-1 ring-accent/60" : "hover:bg-white/[0.06]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{item.provider.businessName ?? item.provider.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                      item.status === "PAID" ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200",
                    )}
                  >
                    {item.status === "PAID" ? "To do" : "Done"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {item.provider.category ? CATEGORIES[item.provider.category].label : "Uncategorised"} · paid {formatMoney(item.feeCents, item.currency)} ·{" "}
                  {item.provider._count.services} services, {item.provider._count.availability} days set
                </p>
              </button>
            ))}
          </aside>

          <AnimatePresence mode="wait" initial={false}>
            {active && (
              <motion.section key={active.id} variants={fadeVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                <div className="glass rounded-3xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{active.provider.businessName ?? active.provider.name}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
                        <span>{active.provider.name}</span>
                        <a href={`mailto:${active.provider.email}`} className="flex items-center gap-1 hover:text-ink">
                          <Mail className="size-3.5" /> {active.provider.email}
                        </a>
                        {active.provider.phone && (
                          <a href={`tel:${active.provider.phone}`} className="flex items-center gap-1 hover:text-ink">
                            <Phone className="size-3.5" /> {active.provider.phone}
                          </a>
                        )}
                        {active.provider.slug && (
                          <Link href={`/book/${active.provider.slug}`} target="_blank" className="flex items-center gap-1 hover:text-ink">
                            <ExternalLink className="size-3.5" /> /book/{active.provider.slug}
                          </Link>
                        )}
                      </p>
                    </div>
                    {active.status === "PAID" ? (
                      <Button onClick={() => void setStatus(active.id, "DONE")}>
                        <CheckCircle2 className="size-4" /> Mark done
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => void setStatus(active.id, "PAID")}>
                        <RotateCcw className="size-4" /> Reopen
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[13px]">
                    <p className="mb-1 font-medium">What they sent</p>
                    <p className="whitespace-pre-wrap text-ink-muted">{active.notes}</p>
                  </div>
                </div>

                <div className="glass flex w-fit rounded-xl p-1">
                  {(["services", "availability", "settings"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={cn("relative rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors", tab === t ? "text-ink" : "text-ink-muted hover:text-ink")}
                    >
                      {tab === t && <motion.span layoutId="admin-tab" transition={spring.morph} className="absolute inset-0 rounded-lg bg-white/10" />}
                      <span className="relative">{t}</span>
                    </button>
                  ))}
                </div>

                <div key={`${active.provider.id}-${tab}`}>
                  {tab === "services" && <ServicesManager providerId={active.provider.id} embedded />}
                  {tab === "availability" && <AvailabilityEditor providerId={active.provider.id} embedded />}
                  {tab === "settings" && <SettingsForm providerId={active.provider.id} embedded />}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
