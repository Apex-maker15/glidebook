import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { providerScope } from "@/lib/admin";
import { handle, readJson } from "@/lib/api";
import { serviceInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const select = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  priceCents: true,
  currency: true,
  active: true,
  sortOrder: true,
};

export const GET = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  const services = await prisma.service.findMany({
    where: { providerId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select,
  });
  return NextResponse.json({ services });
});

export const POST = handle(async (req: Request) => {
  const { providerId } = await providerScope(req);
  const input = serviceInputSchema.parse(await readJson(req));
  const [count, provider] = await Promise.all([
    prisma.service.count({ where: { providerId } }),
    prisma.user.findUnique({ where: { id: providerId }, select: { currency: true } }),
  ]);
  const service = await prisma.service.create({
    data: {
      providerId,
      currency: provider?.currency ?? "gbp",
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? count,
    },
    select,
  });
  return NextResponse.json({ service }, { status: 201 });
});
