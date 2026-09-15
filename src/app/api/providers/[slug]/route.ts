import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError } from "@/lib/api";
import { providerSelect, toProviderDTO } from "@/lib/bookings";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
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
  if (!provider) throw new HttpError(404, "Provider not found", "NOT_FOUND");
  return NextResponse.json({ provider, services: row.services });
});
