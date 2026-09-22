import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/email";
import { Faq, HowItWorks, LiveDemo } from "@/components/landing-sections";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { SiteFooter } from "@/components/site-footer";
import { CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Deposits that lock the slot",
    body: "Choose 25%, 50% or full payment. The client pays when they book, by card through your own Stripe account or through your own payment link. Cancel late and the deposit stays with you.",
  },
  {
    title: "A service area that says no",
    body: "List the cities you cover and the ZIP or postcode prefixes you accept. The form asks for the client's ZIP first and turns away anything outside it, before they can pick a time.",
  },
  {
    title: "Packages priced by vehicle size",
    body: "Gold, Platinum, Diamond, or whatever you call them, each with a price and a duration for cars, SUVs, trucks and vans. A travel buffer sits between jobs so you are never booked back to back across town.",
  },
  {
    title: "Your page, your brand",
    body: "Logo, cover photo, six photos of recent work, your Instagram handle and your accent colour. Reviews come only from clients who actually booked, after the appointment.",
  },
  {
    title: "Fewer no-shows",
    body: "Every booking gets a confirmation with a calendar invite, a reminder the day before, and a link the client can use to cancel themselves inside your rules.",
  },
  {
    title: "DM bookings still count",
    body: "Agreed a job over Instagram? Add it to your schedule and the slot disappears from your page, so nobody double-books you.",
  },
];

export default async function HomePage() {
  const listed = { role: "PROVIDER" as const, slug: { not: null }, businessName: { not: null }, services: { some: { active: true } } };
  const [providers, withCover] = await Promise.all([
    prisma.user.findMany({
      where: listed,
      select: { slug: true, businessName: true, category: true, serviceAreas: true, _count: { select: { services: { where: { active: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    // The embedded demo is a real page: the longest-standing detailer with a cover photo.
    prisma.user.findFirst({
      where: { ...listed, category: "CAR_DETAILING", coverData: { not: null } },
      select: { slug: true, businessName: true, serviceAreas: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  // Detailers are the focus right now: show them first, then everyone else.
  providers.sort((a, b) => Number(b.category === "CAR_DETAILING") - Number(a.category === "CAR_DETAILING"));
  const demo = withCover ?? providers[0] ?? null;
  const host = new URL(appUrl()).host;

  return (
    <div data-accent="neutral" className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-2 text-sm">
          <ThemeToggle className="mr-1" />
          <Link href="/login" className="rounded-lg px-3 py-2 text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link href="/register" className="rounded-lg border border-line-strong px-3.5 py-2 font-medium hover:bg-white/[0.04]">
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid items-center gap-12 pt-16 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-muted">Free booking pages for mobile detailers</p>
            <h1 className="mt-5 max-w-2xl text-[44px] leading-[1.02] sm:text-6xl">Deposits before you drive out.</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              A booking page for mobile detailing. Clients pick a package by vehicle size, choose a time inside your service area
              and pay a deposit, so the job is real before you load the van.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className="inline-flex h-12 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-black hover:bg-accent-strong">
                Create your booking page
              </Link>
              {demo && (
                <Link href={`/book/${demo.slug}`} className="inline-flex h-12 items-center rounded-lg border border-line-strong px-6 text-sm font-medium hover:bg-white/[0.04]">
                  Open a live page
                </Link>
              )}
            </div>
            <p className="mt-5 text-[13px] text-ink-muted">
              No monthly fee and no commission. Deposits go to your Stripe account or your own payment link, never through us.
            </p>
          </div>

          {demo && <LiveDemo host={host} slug={demo.slug!} name={demo.businessName!} areas={demo.serviceAreas} />}
        </section>

        <section className="mt-28 border-t border-line pt-10">
          <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <h2 className="text-2xl">What the page does</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Built with a Phoenix detailer whose first two questions were about deposits and service areas. Everything below is live today.
              </p>
            </div>
            <dl className="grid gap-x-12 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="border-t border-line py-6 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
                  <dt className="font-semibold">{f.title}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-8 text-[13px] text-ink-muted">Also used by nail techs, barbers and pet groomers. Anything booked by the hour works.</p>
        </section>

        <HowItWorks />

        {providers.length > 0 && (
          <section className="mt-28 border-t border-line pt-10">
            <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <h2 className="text-2xl">Live pages</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">Pages built on GlideBook. Open one and try the flow.</p>
              </div>
              <ul className="divide-y divide-line border-y border-line">
                {providers.map((p) => {
                  const meta = CATEGORIES[p.category ?? "OTHER"];
                  return (
                    <li key={p.slug}>
                      <Link href={`/book/${p.slug}`} className="group flex items-baseline gap-4 py-4 hover:bg-white/[0.03]">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold group-hover:underline">{p.businessName}</span>
                          <span className="block text-[13px] text-ink-muted">
                            {meta.tagline}
                            {p.serviceAreas ? ` in ${p.serviceAreas}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] tabular-nums text-ink-muted">
                          {p._count.services} {p._count.services === 1 ? "service" : "services"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        <Faq />

        <section className="mt-28 border-t border-line pt-12">
          <h2 className="max-w-xl text-3xl sm:text-4xl">Your booking page in ten minutes. Or send us your price list and we build it.</h2>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="inline-flex h-12 items-center rounded-lg bg-accent px-6 text-sm font-semibold text-black hover:bg-accent-strong">
              Create your booking page
            </Link>
            <span className="text-[13px] text-ink-muted">Free. Deposits from your first client.</span>
          </div>
        </section>
      </main>

      <SiteFooter className="pb-10" />
    </div>
  );
}
