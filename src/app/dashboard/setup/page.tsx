import type { Metadata } from "next";
import { SetupOffer } from "@/components/dashboard/setup-offer";
import { publishableKey } from "@/lib/stripe";

export const metadata: Metadata = { title: "Get set up" };
export const dynamic = "force-dynamic";

export default function SetupPage() {
  return <SetupOffer publishableKey={publishableKey()} />;
}
