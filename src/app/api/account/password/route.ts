import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { handle, HttpError, readJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters").max(128),
});

/** POST /api/account/password { currentPassword, newPassword } - the signed-in user changes their own password. */
export const POST = handle(async (req: Request) => {
  rateLimit(req, "password", 10, 15 * 60_000);
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Sign in first", "UNAUTHENTICATED");
  const { currentPassword, newPassword } = bodySchema.parse(await readJson(req));

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new HttpError(403, "Current password is incorrect", "BAD_PASSWORD");
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  return NextResponse.json({ ok: true });
});
