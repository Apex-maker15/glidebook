import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { providerSelect, toProviderDTO } from "@/lib/bookings";
import { parseAvailability } from "@/lib/slots";
import { reviewSummaryFor } from "@/lib/reviews";
import { publishableKey } from "@/lib/stripe";
import { accentVars } from "@/lib/color";
import { CATEGORIES } from "@/lib/categories";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { ProviderHero } from "@/components/booking/provider-hero";
import { ProviderInfo, type DayHours } from "@/components/booking/provider-info";
import { Gallery, Reviews } from "@/components/booking/provider-social";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function loadProvider(slug: string) {
  const row = await prisma.user.findUnique({
    where: { slug },
    select: {
      ...providerSelect,
      services: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, description: true, durationMinutes: true, priceCents: true, currency: true, active: true, sortOrder: true },
      },
      availability: { select: { dayOfWeek: true, slots: true } },
    },
  });
  const provider = row && toProviderDTO(row);
  if (!row || !provider) return null;
  return { provider, services: row.services, availability: row.availability };
}

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

function hoursFor(availability: { dayOfWeek: number; slots: unknown }[], timezone: string): DayHours[] {
  const todayIndex = Number(formatInTimeZone(new Date(), timezone, "i")) % 7; // ISO day 1-7 -> 0 = Sunday
  // Start the week on Monday like a shop sign would.
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const parsed = parseAvailability(availability.find((a) => a.dayOfWeek === day)?.slots);
    const windows = parsed?.windows ?? [];
    return {
      label: DAY_LABELS[day],
      hours: windows.length ? windows.map((w) => `${to12h(w.start)} – ${to12h(w.end)}`).join(", ") : null,
      today: day === todayIndex,
    };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProvider(slug);
  if (!data) return { title: "Not found" };
  const cheapest = data.services.length ? Math.min(...data.services.map((s) => s.priceCents)) : null;
  const from =
    cheapest !== null
      ? ` - from ${new Intl.NumberFormat("en-GB", { style: "currency", currency: data.provider.currency.toUpperCase(), minimumFractionDigits: 0 }).format(cheapest / 100)}`
      : "";
  const description = data.provider.tagline ?? `Book ${data.provider.businessName} online${from}. Pick a time, secure it with a deposit, done.`;
  return {
    title: `${data.provider.businessName} - book online`,
    description,
    openGraph: { title: data.provider.businessName, description },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadProvider(slug);
  if (!data) notFound();
  const { provider, services, availability } = data;
  const reviews = await reviewSummaryFor(provider.id);
  const meta = CATEGORIES[provider.category];

  return (
    <div data-accent={meta.accent} style={accentVars(provider.accentColor)} className="min-h-dvh">
      <ProviderHero provider={provider} />
      <Gallery photos={provider.gallery} businessName={provider.businessName} />
      <Reviews summary={reviews} />
      {/* The wizard never shows the images, so keep them out of its serialised props. */}
      <BookingWizard provider={{ ...provider, coverData: null, gallery: [] }} services={services} stripePublishableKey={publishableKey()} />
      <ProviderInfo provider={provider} hours={hoursFor(availability, provider.timezone)} />
      <SiteFooter poweredBy className="pb-28 pt-12 lg:pb-10" />
    </div>
  );
}
