import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api";

/** Comma-separated list of admin emails, e.g. ADMIN_EMAILS="you@example.com,ops@example.com". */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().includes(email!.toLowerCase());
}

export interface ProviderScope {
  /** The provider whose data is being read or written. */
  providerId: string;
  /** The signed-in user. */
  userId: string;
  isAdmin: boolean;
  /** True when an admin is acting on someone else's account. */
  impersonating: boolean;
}

/**
 * Resolve which provider a dashboard API call targets.
 * Providers always act on themselves. Admins may pass `?providerId=` to act on
 * another provider (used by the done-for-you setup queue).
 */
export async function providerScope(req: Request): Promise<ProviderScope> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new HttpError(401, "Sign in first", "UNAUTHENTICATED");

  const isAdmin = isAdminEmail(user.email);
  const requested = new URL(req.url).searchParams.get("providerId");

  if (requested && requested !== user.id) {
    if (!isAdmin) throw new HttpError(403, "Not allowed", "FORBIDDEN");
    const target = await prisma.user.findFirst({ where: { id: requested, role: "PROVIDER" }, select: { id: true } });
    if (!target) throw new HttpError(404, "Provider not found", "NOT_FOUND");
    return { providerId: target.id, userId: user.id, isAdmin, impersonating: true };
  }

  if (user.role !== "PROVIDER" && !isAdmin) throw new HttpError(401, "Sign in as a provider", "UNAUTHENTICATED");
  return { providerId: user.id, userId: user.id, isAdmin, impersonating: false };
}

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !isAdminEmail(user.email)) throw new HttpError(403, "Admins only", "FORBIDDEN");
  return { id: user.id, email: user.email! };
}

export const SETUP_FEE_CENTS = 500; // £5.00
export const SETUP_FEE_CURRENCY = "gbp";
