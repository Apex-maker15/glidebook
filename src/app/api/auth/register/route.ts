import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { CATEGORIES } from "@/lib/categories";

export const runtime = "nodejs";

const DEFAULT_DAY = {
  windows: [{ start: "09:00", end: "17:00" }],
  breaks: [{ start: "12:00", end: "12:30" }],
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48) || "provider";
}

export const POST = handle(async (req: Request) => {
  const input = registerSchema.parse(await readJson(req));
  const email = input.email.toLowerCase();

  try {
    Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
  } catch {
    throw new HttpError(422, "Unknown timezone", "BAD_TIMEZONE");
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (existing?.passwordHash) throw new HttpError(409, "An account with that email already exists", "EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const base = slugify(input.businessName);

  // Try the clean slug first, then append a short suffix until one is free.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      const data = {
        name: input.name,
        passwordHash,
        role: Role.PROVIDER,
        businessName: input.businessName,
        slug,
        category: input.category,
        timezone: input.timezone,
        currency: input.currency,
        locationMode: input.locationMode ?? CATEGORIES[input.category].defaultLocation,
        // Beauty pros usually take a deposit; mobile trades usually take full payment.
        depositPercent: input.category === "NAILS_BEAUTY" || input.category === "HAIR_BARBER" ? 30 : 100,
      };
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: {
              ...data,
              availability: { createMany: { data: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, slots: DEFAULT_DAY })) } },
            },
          })
        : await prisma.user.create({
            data: {
              ...data,
              email,
              availability: { create: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, slots: DEFAULT_DAY })) },
            },
          });
      return NextResponse.json({ id: user.id, slug: user.slug }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw new HttpError(500, "Could not allocate a unique booking link", "SLUG_EXHAUSTED");
});
