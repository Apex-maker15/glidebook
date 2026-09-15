import Link from "next/link";
import { ArrowRight, Car, CreditCard, PawPrint, Radio, Sparkles, Timer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER", slug: { not: null }, businessName: { not: null } },
    select: { slug: true, businessName: true, category: true, _count: { select: { services: { where: { active: true } } } } },
    orderBy: { createdAt: "asc" },
    take: 12,
  });

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6">
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
            <Sparkles className="size-4" />
          </span>
          GlideBook
        </span>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-xl px-3 py-2 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink">
            Provider sign in
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
              <Radio className="size-3 text-accent-strong" /> Live bookings, zero refreshes
            </p>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="text-gradient mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Booking that feels as polished as your work.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
              A luxury booking experience for mobile car detailers and pet groomers. Customers pick a slot, pay upfront, and
              the job lands on your dashboard the instant the card clears.
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
            { icon: <Timer className="size-5" />, title: "Conflict-proof slots", body: "Overlaps, breaks, travel buffers and notice periods are enforced server-side inside a locked transaction." },
            { icon: <CreditCard className="size-5" />, title: "Paid before you drive", body: "Stripe Payment Element is embedded in the last step. No-shows stop costing you fuel." },
            { icon: <Radio className="size-5" />, title: "Real-time dashboard", body: "Paid jobs slide into your schedule live over a persistent stream, with a glow so you never miss one." },
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

        {providers.length > 0 && (
          <section className="mt-24">
            <Reveal>
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-ink-muted">Try a live booking page</h2>
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {providers.map((p, i) => {
                const car = p.category === "CAR_DETAILING";
                return (
                  <Reveal key={p.slug} delay={0.06 * i}>
                    <Link
                      href={`/book/${p.slug}`}
                      data-accent={car ? "car" : "pet"}
                      className="glass group flex items-center gap-4 rounded-3xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent-strong ring-1 ring-accent/30">
                        {car ? <Car className="size-6" /> : <PawPrint className="size-6" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.businessName}</span>
                        <span className="block text-[13px] text-ink-muted">
                          {car ? "Mobile car detailing" : "Mobile pet grooming"} · {p._count.services} services
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
      </main>
    </div>
  );
}
