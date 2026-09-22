import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Wordmark } from "@/components/wordmark";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";
import { ManageBooking } from "@/components/booking/manage-booking";
import { ReviewForm } from "@/components/booking/review-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { accentVars } from "@/lib/color";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

/** Client self-service page, reached from the confirmation email. Never indexed. */
export default async function ManageBookingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t) notFound();

  const b = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      customer: { select: { name: true } },
      review: { select: { rating: true, text: true } },
      provider: {
        select: { businessName: true, name: true, slug: true, category: true, timezone: true, locationMode: true, studioAddress: true, cancelNoticeHours: true, phone: true, accentColor: true },
      },
    },
  });
  if (!b || b.manageToken !== t) notFound();

  const tz = b.provider.timezone;
  const meta = CATEGORIES[b.provider.category ?? "OTHER"];
  // Server component: reading the clock here is fine, it renders once per request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const hoursUntil = (b.startTime.getTime() - now) / 3_600_000;

  return (
    <div data-accent={meta.accent} style={accentVars(b.provider.accentColor)} className="min-h-dvh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-6 sm:px-6">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <ManageBooking
          booking={{
            id: b.id,
            token: t,
            status: b.status,
            clientName: b.customer.name,
            businessName: b.provider.businessName ?? b.provider.name,
            providerSlug: b.provider.slug,
            providerPhone: b.provider.phone,
            serviceName: b.service.name,
            durationMinutes: b.service.durationMinutes,
            dateLabel: formatInTimeZone(b.startTime, tz, "EEEE d MMMM yyyy"),
            timeLabel: `${formatInTimeZone(b.startTime, tz, "HH:mm")} - ${formatInTimeZone(b.endTime, tz, "HH:mm")}`,
            timezone: tz,
            location: b.provider.locationMode === "MOBILE" ? b.address : (b.provider.studioAddress ?? null),
            totalLabel: formatMoney(b.amountCents, b.currency),
            paidLabel: b.depositCents > 0 ? formatMoney(b.depositCents, b.currency) : null,
            depositLink: b.status === "CONFIRMED" ? b.depositLink : null,
            manualDeposit: Boolean(b.depositLink),
            balanceLabel: b.amountCents > b.depositCents ? formatMoney(b.amountCents - b.depositCents, b.currency) : null,
            cancelNoticeHours: b.provider.cancelNoticeHours,
            refundable: hoursUntil >= b.provider.cancelNoticeHours,
            isPast: b.endTime.getTime() < now,
            startIso: b.startTime.toISOString(),
            endIso: b.endTime.toISOString(),
          }}
        />
        {b.status !== "CANCELLED" && b.endTime.getTime() < now && (
          <ReviewForm bookingId={b.id} token={t} businessName={b.provider.businessName ?? b.provider.name} existing={b.review} />
        )}
      </main>
      <SiteFooter poweredBy className="pb-10" />
    </div>
  );
}
