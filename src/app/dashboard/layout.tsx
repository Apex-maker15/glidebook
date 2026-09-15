import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PROVIDER") redirect("/login?next=/dashboard");

  const provider = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { businessName: true, slug: true },
  });
  if (!provider?.slug) redirect("/login");

  return (
    <DashboardShell businessName={provider.businessName ?? "Your business"} slug={provider.slug}>
      {children}
    </DashboardShell>
  );
}
