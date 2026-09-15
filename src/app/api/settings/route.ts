import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
import { providerSelect, toProviderDTO } from "@/lib/bookings";
import { providerSettingsSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: providerSelect });
  const provider = row && toProviderDTO(row);
  if (!provider) throw new HttpError(404, "Provider profile not found", "NOT_FOUND");
  return NextResponse.json({ provider });
});

export const PATCH = handle(async (req: Request) => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const input = providerSettingsSchema.parse(await readJson(req));
  if (input.timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
    } catch {
      throw new HttpError(422, "Unknown timezone", "BAD_TIMEZONE");
    }
  }
  const row = await prisma.user.update({ where: { id: user.id }, data: input, select: providerSelect });
  return NextResponse.json({ provider: toProviderDTO(row) });
});
