import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
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

export const GET = handle(async () => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const services = await prisma.service.findMany({
    where: { providerId: user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select,
  });
  return NextResponse.json({ services });
});

export const POST = handle(async (req: Request) => {
  const user = await requireProvider();
  if (!user) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  const input = serviceInputSchema.parse(await readJson(req));
  const count = await prisma.service.count({ where: { providerId: user.id } });
  const service = await prisma.service.create({
    data: {
      providerId: user.id,
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
