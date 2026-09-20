import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/admin-overview";

export const metadata: Metadata = { title: "Owner" };
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminOverview />;
}
