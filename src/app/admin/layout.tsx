import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

/** Every /admin screen: owner-only, rendered inside the normal dashboard chrome. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin");
  if (!isAdminEmail(session.user.email)) redirect("/dashboard");

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { businessName: true, slug: true } });

  return (
    <DashboardShell businessName={me?.businessName ?? "Admin"} slug={me?.slug ?? ""} isAdmin>
      {children}
    </DashboardShell>
  );
}
