import Link from "next/link";
import { ArrowRight, Money } from "@/components/icons";

/** Shown on the schedule until the provider's Stripe account can take deposits. */
export function ConnectBanner({ started }: { started: boolean }) {
  return (
    <Link
      href="/dashboard/payments"
      className="group mb-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm transition-colors hover:bg-accent/15"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-strong">
        <Money className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{started ? "Finish connecting Stripe to start taking deposits" : "You're not taking deposits yet"}</span>
        <span className="block text-[13px] text-ink-muted">
          Clients currently book without paying. Connect your bank in two minutes and deposits land automatically.
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-ink-muted" />
    </Link>
  );
}
