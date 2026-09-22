"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, ArrowSquareOut, Copy, Envelope, Phone } from "@/components/icons";
import { Skeleton, StatusBadge } from "@/components/ui/primitives";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PageBranding } from "@/components/dashboard/page-branding";
import { StripePill } from "@/components/admin/admin-overview";
import { spring } from "@/components/motion";
import { api, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import { CATEGORIES } from "@/lib/categories";
import { cn, formatMoney } from "@/lib/utils";
import { useNow } from "@/lib/use-now";
import type { BookingDTO, BusinessCategory, LocationMode } from "@/types";

interface Detail {
  provider: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    businessName: string | null;
    slug: string | null;
    category: BusinessCategory | null;
    currency: string;
    timezone: string;
    country: string;
    locationMode: LocationMode;
    depositPercent: number;
    stripe: "connected" | "incomplete" | "none";
    payoutsEnabled: boolean;
    createdAt: string;
    _count: { services: number; availability: number };
  };
  bookings: BookingDTO[];
}

type Tab = "bookings" | "services" | "availability" | "page" | "settings";

/** Owner view of one provider: their account, their bookings, and the same editors they see - acting on their behalf. */
export function ProviderWorkbench({ providerId }: { providerId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("bookings");
  const push = useToastStore((s) => s.push);
  const now = useNow(60_000);

  useEffect(() => {
    api<Detail>(`/api/admin/providers/${providerId}`)
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, [providerId]);

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      push({ tone: "success", title: "Link copied", description: url });
    } catch {
      push({ tone: "info", title: "Booking link", description: url });
    }
  };

  if (error) return <p className="text-sm text-bad">{error}</p>;
  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  const p = data.provider;
  const paid = data.bookings.filter((b) => b.status === "PAID");
  const deposits = paid.reduce((s, b) => s + b.depositCents, 0);
  const fees = paid.reduce((s, b) => s + b.platformFeeCents, 0);
  const upcoming = data.bookings.filter((b) => b.status !== "CANCELLED" && new Date(b.endTime).getTime() >= now).length;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> All providers
      </Link>

      <header className="glass mb-4 rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              {p.category ? CATEGORIES[p.category].label : "Provider"} · {p.locationMode === "MOBILE" ? "mobile" : "studio"} · {p.country}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.businessName ?? p.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
              <span>{p.name}</span>
              <a href={`mailto:${p.email}`} className="flex items-center gap-1 hover:text-ink">
                <Envelope className="size-3.5" /> {p.email}
              </a>
              {p.phone && (
                <a href={`tel:${p.phone}`} className="flex items-center gap-1 hover:text-ink">
                  <Phone className="size-3.5" /> {p.phone}
                </a>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StripePill state={p.stripe} />
            {p.slug && (
              <>
                <button
                  type="button"
                  onClick={() => void copyLink(p.slug!)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-[13px] font-medium hover:bg-white/10"
                >
                  <Copy className="size-3.5" /> Copy link
                </button>
                <Link href={`/book/${p.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-[13px] font-medium hover:bg-white/10">
                  <ArrowSquareOut className="size-3.5" /> /book/{p.slug}
                </Link>
              </>
            )}
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          {[
            ["Upcoming", String(upcoming)],
            ["Paid bookings", String(paid.length)],
            ["Deposits collected", formatMoney(deposits, p.currency)],
            ["Your fees", formatMoney(fees, p.currency)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted">{k}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="glass mb-4 flex w-fit rounded-xl p-1">
        {(["bookings", "services", "availability", "page", "settings"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("relative rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors", tab === t ? "text-ink" : "text-ink-muted hover:text-ink")}
          >
            {tab === t && <motion.span layoutId="workbench-tab" transition={spring.morph} className="absolute inset-0 rounded-lg bg-white/10" />}
            <span className="relative">{t}</span>
          </button>
        ))}
      </div>

      <div key={tab}>
        {tab === "bookings" && (
          <div className="glass overflow-x-auto rounded-3xl">
            {data.bookings.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-muted">No bookings yet</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-ink-muted">
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Where</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.map((b) => (
                    <tr key={b.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-4 py-3 tabular-nums">{formatInTimeZone(new Date(b.startTime), p.timezone, "EEE d MMM yyyy, HH:mm")}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{b.customer.name}</p>
                        <p className="text-[12px] text-ink-muted">{b.customer.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{b.service.name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {b.depositCents > 0 ? formatMoney(b.depositCents, b.currency) : <span className="text-ink-muted">on the day</span>}
                        <span className="block text-[11px] text-ink-muted">of {formatMoney(b.amountCents, b.currency)}</span>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-[12px] text-ink-muted">{[b.address, b.postcode].filter(Boolean).join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {tab === "services" && <ServicesManager providerId={p.id} embedded />}
        {tab === "availability" && <AvailabilityEditor providerId={p.id} embedded />}
        {tab === "page" && <PageBranding providerId={p.id} embedded />}
        {tab === "settings" && <SettingsForm providerId={p.id} embedded />}
      </div>
    </div>
  );
}
