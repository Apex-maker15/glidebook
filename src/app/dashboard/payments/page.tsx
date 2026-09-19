import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsPanel } from "@/components/dashboard/payments-panel";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-64 max-w-3xl rounded-3xl" />}>
      <PaymentsPanel />
    </Suspense>
  );
}
