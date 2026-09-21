import type { Metadata } from "next";
import { BusinessPanel } from "@/components/dashboard/business-panel";

export const metadata: Metadata = { title: "Business" };
export const dynamic = "force-dynamic";

export default function BusinessPage() {
  return <BusinessPanel />;
}
