import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookingBoard } from "@/components/dashboard/booking-board";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const provider = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { timezone: true, businessName: true } });

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Schedule</p>
        <h1 className="text-gradient mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{provider?.businessName}</h1>
      </header>
      <BookingBoard timezone={provider?.timezone ?? "UTC"} />
    </div>
  );
}
