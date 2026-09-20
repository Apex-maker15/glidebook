import Link from "next/link";
import { ArrowRight, CreditCard, MapPinned, Radio, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/reveal";
import { Faq, HowItWorks } from "@/components/landing-sections";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER", slug: { not: null }, businessName: { not: null }, services: { some: { active: true } } },
    select: { slug: true, businessName: true, category: true, _count: { select: { services: { where: { active: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  // Detailers are the focus right now: show them first, then everyone else.
  providers.sort((a, b) => Number(b.category === "CAR_DETAILING") - Number(a.category === "CAR_DETAILING"));

  return (
    <div data-accent="car" className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
            <Sparkles className="size-4" />
          </span>
          GlideBook
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-xl px-3 py-2 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink">
            Sign in
          </Link>
          <Link href="/register" className="rounded-xl bg-white/[0.06] px-3.5 py-2 font-medium transition-colors hover:bg-white/10">
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <section className="pt-20 text-center sm:pt-28">
          <Reveal>
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-ink-muted">
              <Sparkles className="size-3 text-accent-strong" /> For mobile detailers & car valeters
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="text-gradient mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Deposits before you drive out.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
              A free booking page for mobile detailing. Clients pick a package by vehicle size, choose a time inside your
              service area and pay a deposit - so the job is real before you load the van. No monthly fee, no commission.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-sm font-semibold text-black shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Create your booking page <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="glass inline-flex h-12 items-center rounded-2xl px-6 text-sm font-medium transition-colors hover:bg-white/10"
              >
                Open the dashboard
              </Link>
            </div>
          </Reveal>
        </section>

        <section className="mt-24 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <CreditCard className="size-5" />,
              title: "Deposits, automatically",
              body: "Set 25%, 50% or full payment. Clients pay before the slot is theirs, so a cancelled Saturday stops costing you fuel and a day.",
            },
            {
              icon: <MapPinned className="size-5" />,
              title: "Your service area, enforced",
              body: "List the cities you cover and the ZIP prefixes you accept. Anyone outside them cannot book, so you never drive across the state for one wash.",
            },
            {
              icon: <Radio className="size-5" />,
              title: "Packages by vehicle size",
              body: "Gold, Platinum, Diamond - priced for cars, SUVs, trucks and vans - with the time each really takes, plus a travel buffer between jobs.",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={0.08 * i}>
              <div className="glass h-full rounded-3xl p-6">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/[0.12] text-accent-strong">{f.icon}</span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </section>

        <Reveal>
          <p className="mt-10 text-center text-[13px] text-ink-muted">
            Also works for nail techs, barbers, pet groomers and any appointment-based service.
          </p>
        </Reveal>

        <HowItWorks />

        {providers.length > 0 && (
          <section className="mt-24">
            <Reveal>
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-ink-muted">Try a live booking page</h2>
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {providers.map((p, i) => {
                const meta = CATEGORIES[p.category ?? "OTHER"];
                return (
                  <Reveal key={p.slug} delay={0.06 * i}>
                    <Link
                      href={`/book/${p.slug}`}
                      data-accent={meta.accent}
                      className="glass group flex items-center gap-4 rounded-3xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent-strong ring-1 ring-accent/30">
                        <CategoryIcon category={p.category ?? "OTHER"} className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.businessName}</span>
                        <span className="block text-[13px] text-ink-muted">
                          {meta.tagline} · {p._count.services} services
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        <Faq />

        <Reveal>
          <section className="mt-24 text-center">
            <h2 className="text-gradient text-3xl font-semibold tracking-tight sm:text-4xl">Your booking page in 10 minutes.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">Free forever. Deposits from your very first client.</p>
            <Link
              href="/register"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-sm font-semibold text-black shadow-glow transition-transform hover:-translate-y-0.5"
            >
              Create your booking page <ArrowRight className="size-4" />
            </Link>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
