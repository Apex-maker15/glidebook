import { Clock, MapPinned, Sparkles, Wallet } from "lucide-react";
import type { ProviderDTO } from "@/types";

export interface DayHours {
  label: string;
  /** e.g. "9:00 am – 5:00 pm" or null when closed */
  hours: string | null;
  today: boolean;
}

/**
 * The part of the page a client reads before or after booking: who the
 * provider is, when they work, where they go and what the deposit rules are.
 */
export function ProviderInfo({ provider, hours }: { provider: ProviderDTO; hours: DayHours[] }) {
  const depositLine =
    provider.depositMode === "none"
      ? "Nothing to pay online - you settle up on the day."
      : provider.depositPercent >= 100
        ? `Paid in full when you book${provider.depositMode === "link" ? " through their payment link" : " by card"}.`
        : `${provider.depositPercent}% deposit when you book${provider.depositMode === "link" ? " through their payment link" : " by card"}; the rest on the day.`;
  const cancelLine =
    provider.cancelNoticeHours > 0
      ? `Cancel more than ${provider.cancelNoticeHours} hours ahead for a full refund of any deposit. Inside that window the deposit is kept.`
      : "Cancel any time before the appointment for a full refund of any deposit.";

  return (
    <section className="mx-auto mt-10 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-3">
      {provider.bio && (
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-accent-strong" /> About
          </h2>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">{provider.bio}</p>
        </div>
      )}

      <div className="glass rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-accent-strong" /> Hours
        </h2>
        <dl className="mt-3 space-y-1.5 text-[14px]">
          {hours.map((d) => (
            <div key={d.label} className={`flex items-baseline justify-between gap-4 ${d.today ? "font-medium text-ink" : "text-ink-muted"}`}>
              <dt>
                {d.label}
                {d.today && <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-strong">Today</span>}
              </dt>
              <dd className="tabular-nums">{d.hours ?? "Closed"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12px] text-ink-muted/80">Times in {provider.timezone.replace(/_/g, " ")}</p>
      </div>

      {provider.locationMode === "MOBILE" && provider.serviceAreas && (
        <div className="glass rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPinned className="size-4 text-accent-strong" /> Where we go
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{provider.serviceAreas}</p>
          {provider.serviceAreaCodes && (
            <p className="mt-2 text-[12px] text-ink-muted/80">Bookings are limited to these areas - we check your postcode at booking.</p>
          )}
        </div>
      )}

      {provider.locationMode === "STUDIO" && provider.studioAddress && (
        <div className="glass overflow-hidden rounded-3xl">
          <iframe
            title={`Map of ${provider.businessName}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(provider.studioAddress)}&z=14&output=embed`}
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <p className="flex items-center gap-2 px-5 py-3 text-[13px] text-ink-muted">
            <MapPinned className="size-3.5 text-accent-strong" /> {provider.studioAddress}
          </p>
        </div>
      )}

      <div className={`glass rounded-3xl p-6 ${(provider.locationMode === "MOBILE" && provider.serviceAreas) || (provider.locationMode === "STUDIO" && provider.studioAddress) ? "" : "lg:col-span-2"}`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="size-4 text-accent-strong" /> Good to know
        </h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-muted">
          <li>{depositLine}</li>
          <li>{cancelLine}</li>
          <li>
            {provider.locationMode === "MOBILE"
              ? provider.category === "CAR_DETAILING"
                ? "Please have water and power access nearby, and somewhere for the van to park."
                : "We come to your address - please make sure there is room to set up."
              : provider.studioAddress
                ? `Studio: ${provider.studioAddress}`
                : "Exact address is shared once you book."}
          </li>
        </ul>
      </div>
    </section>
  );
}
