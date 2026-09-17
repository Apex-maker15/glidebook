import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyReminder } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/reminders - runs daily (see vercel.json). Emails every client
 * whose appointment starts 12-40 hours from now and has not been reminded yet.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anyone else is rejected.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const due = await prisma.booking.findMany({
    where: {
      status: { in: [BookingStatus.PAID, BookingStatus.CONFIRMED] },
      reminderSentAt: null,
      startTime: { gte: new Date(now + 12 * 3_600_000), lte: new Date(now + 40 * 3_600_000) },
    },
    select: { id: true },
    take: 200,
  });

  let sent = 0;
  for (const { id } of due) {
    // Claim first so a concurrent run cannot double-send.
    const claimed = await prisma.booking.updateMany({ where: { id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (claimed.count === 0) continue;
    const ok = await notifyReminder(id);
    if (ok) sent += 1;
    else await prisma.booking.update({ where: { id }, data: { reminderSentAt: null } });
  }

  return NextResponse.json({ candidates: due.length, sent });
}
