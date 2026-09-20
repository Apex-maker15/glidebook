import type { Metadata } from "next";
import { PageBranding } from "@/components/dashboard/page-branding";

export const metadata: Metadata = { title: "Your page" };
export const dynamic = "force-dynamic";

export default function BrandingPage() {
  return <PageBranding />;
}
