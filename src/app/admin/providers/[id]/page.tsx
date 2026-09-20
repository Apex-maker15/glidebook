import type { Metadata } from "next";
import { ProviderWorkbench } from "@/components/admin/provider-workbench";

export const metadata: Metadata = { title: "Provider" };
export const dynamic = "force-dynamic";

export default async function AdminProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProviderWorkbench providerId={id} />;
}
