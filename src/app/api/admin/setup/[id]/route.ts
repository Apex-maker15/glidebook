import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ status: z.enum(["PAID", "DONE"]) });

/** PATCH /api/admin/setup/:id { status } - mark a request done (or reopen it). */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const { status } = bodySchema.parse(await readJson(req));
  const existing = await prisma.setupRequest.findUnique({ where: { id }, select: { status: true } });
  if (!existing || existing.status === "PENDING_PAYMENT") throw new HttpError(404, "Request not found", "NOT_FOUND");
  const request = await prisma.setupRequest.update({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
    select: { id: true, status: true, completedAt: true },
  });
  return NextResponse.json({ request });
});
