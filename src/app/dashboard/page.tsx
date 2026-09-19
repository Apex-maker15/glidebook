import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingBoard } from "@/components/dashboard/booking-board";
import { ConnectBanner } from "@/components/dashboard/connect-banner";
import { canTakeDeposits } from "@/lib/payments";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const provider = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { timezone: true, currency: true, businessName: true, stripeAccountId: true, stripeChargesEnabled: true },
  });
  const takesDeposits = provider ? canTakeDeposits(provider) : false;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Schedule</p>
        <h1 className="text-gradient mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{provider?.businessName}</h1>
      </header>
      {!takesDeposits && <ConnectBanner started={Boolean(provider?.stripeAccountId)} />}
      <BookingBoard timezone={provider?.timezone ?? "UTC"} currency={provider?.currency ?? "gbp"} />
    </div>
  );
}
