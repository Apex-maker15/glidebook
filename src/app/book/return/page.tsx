import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ booking?: string; redirect_status?: string }> };

/**
 * Landing page for redirect-based payment methods (bank redirects, wallets).
 * Card payments never come here because we confirm with `redirect: "if_required"`.
 */
export default async function ReturnPage({ searchParams }: Props) {
  const { booking: bookingId, redirect_status } = await searchParams;
  const booking = bookingId
    ? await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: { select: { name: true } }, provider: { select: { businessName: true, slug: true, timezone: true } } },
      })
    : null;

  const failed = redirect_status === "failed" || booking?.status === "CANCELLED";
  const paid = booking?.status === "PAID";

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="glass w-full rounded-3xl p-8">
        {!booking ? (
          <>
            <XCircle className="mx-auto size-10 text-red-300" />
            <h1 className="mt-4 text-xl font-semibold">We could not find that booking</h1>
          </>
        ) : failed ? (
          <>
            <XCircle className="mx-auto size-10 text-red-300" />
            <h1 className="mt-4 text-xl font-semibold">Payment did not go through</h1>
            <p className="mt-2 text-sm text-ink-muted">Your slot was not charged. You can start again below.</p>
          </>
        ) : (
          <>
            {paid ? <CheckCircle2 className="mx-auto size-10 text-emerald-300" /> : <Clock className="mx-auto size-10 text-amber-300" />}
            <h1 className="mt-4 text-xl font-semibold">{paid ? "You're booked" : "Payment is processing"}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              {booking.service.name} with {booking.provider.businessName} on{" "}
              {formatInTimeZone(booking.startTime, booking.provider.timezone, "EEEE, MMMM d 'at' h:mm a")} -{" "}
              {formatMoney(booking.amountCents, booking.currency)}.
              {!paid && " We will email you as soon as your bank confirms."}
            </p>
          </>
        )}
        {booking?.provider.slug && (
          <Link
            href={`/book/${booking.provider.slug}`}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-accent px-5 text-sm font-semibold text-black"
          >
            {failed ? "Try again" : "Book another"}
          </Link>
        )}
      </div>
    </main>
  );
}
