import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/setup - paid and completed done-for-you requests, newest first. */
export const GET = handle(async () => {
  await requireAdmin();
  const requests = await prisma.setupRequest.findMany({
    where: { status: { in: ["PAID", "DONE"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      notes: true,
      feeCents: true,
      currency: true,
      paidAt: true,
      completedAt: true,
      createdAt: true,
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          businessName: true,
          slug: true,
          category: true,
          _count: { select: { services: true, availability: true } },
        },
      },
    },
  });
  return NextResponse.json({ requests });
});
