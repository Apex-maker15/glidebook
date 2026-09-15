import type { Metadata } from "next";
import { AvailabilityEditor } from "@/components/dashboard/availability-editor";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilityPage() {
  return <AvailabilityEditor />;
}
