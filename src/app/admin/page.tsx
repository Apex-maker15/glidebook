import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SetupQueue } from "@/components/admin/setup-queue";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/admin");
  if (!isAdminEmail(session.user.email)) redirect("/dashboard");

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { businessName: true, slug: true } });

  return (
    <DashboardShell businessName={me?.businessName ?? "Admin"} slug={me?.slug ?? ""} isAdmin>
      <SetupQueue />
    </DashboardShell>
  );
}
