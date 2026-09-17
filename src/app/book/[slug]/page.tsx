import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { providerSelect, toProviderDTO } from "@/lib/bookings";
import { publishableKey } from "@/lib/stripe";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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
    },
  });
  const provider = row && toProviderDTO(row);
  if (!row || !provider) return null;
  return { provider, services: row.services };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadProvider(slug);
  if (!data) return { title: "Not found" };
  const cheapest = data.services.length ? Math.min(...data.services.map((s) => s.priceCents)) : null;
  const description = `Book ${data.provider.businessName} online${cheapest !== null ? ` - from ${new Intl.NumberFormat("en-GB", { style: "currency", currency: data.provider.currency.toUpperCase(), minimumFractionDigits: 0 }).format(cheapest / 100)}` : ""}. Pick a time, pay your deposit by card, done.`;
  return {
    title: `Book ${data.provider.businessName}`,
    description,
    openGraph: { title: `Book ${data.provider.businessName}`, description },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadProvider(slug);
  if (!data) notFound();

  return (
    <BookingWizard
      provider={data.provider}
      services={data.services}
      stripePublishableKey={publishableKey()}
    />
  );
}
