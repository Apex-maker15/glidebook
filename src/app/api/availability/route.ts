import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { providerScope } from "@/lib/admin";
import { handle, HttpError, readJson } from "@/lib/api";
import { parseAvailability } from "@/lib/slots";
import { availabilityUpsertSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readSchedule(providerId: string) {
  const rows = await prisma.availability.findMany({ where: { providerId }, orderBy: { dayOfWeek: "asc" } });
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    slots: parseAvailability(r.slots) ?? { windows: [], breaks: [] },
  }));
}

export const GET = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  return NextResponse.json({ days: await readSchedule(providerId) });
});

/** PUT replaces the whole weekly schedule. Days omitted from the payload become unavailable. */
export const PUT = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  const { days } = availabilityUpsertSchema.parse(await readJson(req));

  const seen = new Set<number>();
  for (const d of days) {
    if (seen.has(d.dayOfWeek)) throw new HttpError(422, `Day ${d.dayOfWeek} appears twice`, "DUPLICATE_DAY");
    seen.add(d.dayOfWeek);
    for (const b of d.slots.breaks) {
      const inside = d.slots.windows.some((w) => w.start <= b.start && b.end <= w.end);
      if (!inside) {
        throw new HttpError(422, `Break ${b.start}-${b.end} must sit inside a working window`, "BREAK_OUTSIDE_WINDOW");
      }
    }
  }

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { providerId } }),
    ...days
      .filter((d) => d.slots.windows.length > 0)
      .map((d) => prisma.availability.create({ data: { providerId, dayOfWeek: d.dayOfWeek, slots: d.slots } })),
  ]);

  return NextResponse.json({ days: await readSchedule(providerId) });
});
