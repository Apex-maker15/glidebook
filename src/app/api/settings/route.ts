import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { providerScope } from "@/lib/admin";
import { handle, HttpError, readJson } from "@/lib/api";
import { providerSelect, toProviderDTO } from "@/lib/bookings";
import { providerSettingsSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  const row = await prisma.user.findUnique({ where: { id: providerId }, select: providerSelect });
  const provider = row && toProviderDTO(row);
  if (!provider) throw new HttpError(404, "Provider profile not found", "NOT_FOUND");
  return NextResponse.json({ provider });
});

export const PATCH = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  const input = providerSettingsSchema.parse(await readJson(req));
  if (input.timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
    } catch {
      throw new HttpError(422, "Unknown timezone", "BAD_TIMEZONE");
    }
  }
  if (input.locationMode === "STUDIO" && input.studioAddress !== undefined && !input.studioAddress?.trim()) {
    throw new HttpError(422, "Add your studio address so clients know where to go", "STUDIO_ADDRESS_REQUIRED");
  }
  const row = await prisma.user.update({ where: { id: providerId }, data: input, select: providerSelect });
  if (input.currency) {
    await prisma.service.updateMany({ where: { providerId }, data: { currency: input.currency } });
  }
  return NextResponse.json({ provider: toProviderDTO(row) });
});
