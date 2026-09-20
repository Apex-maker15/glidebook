import type { Metadata } from "next";
import { SetupQueue } from "@/components/admin/setup-queue";

export const metadata: Metadata = { title: "Setups" };
export const dynamic = "force-dynamic";

export default function AdminSetupPage() {
  return <SetupQueue />;
}
