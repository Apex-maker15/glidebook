"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown } from "@/components/icons";
import { spring } from "@/components/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Add your packages",
    body: "Gold, Platinum, Diamond, by vehicle size, with your prices and how long each takes. Or paste your price list and we set it up for you, free.",
  },
  {
    title: "Put the link in your bio",
    body: "Your page shows only the times you actually have free, only to clients inside the areas you cover, with a travel buffer between jobs.",
  },
  {
    title: "Deposits land before you drive",
    body: "Clients pay to lock the slot, by card on the page or through your own payment link. Late cancellations keep the deposit.",
  },
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes. GlideBook takes nothing: no monthly fee, no commission, no setup charge. If you take card deposits through Stripe, Stripe charges its usual card fee (about 1.5% + 20p in the UK). That goes to Stripe, not to us.",
  },
  {
    q: "How do deposits work?",
    a: "You choose a percentage; most detailers take 25 to 50%. The client pays it when booking, either by card on the page (through your own Stripe account) or through your own payment link. The rest is paid on the day however you like.",
  },
  {
    q: "What if a client cancels?",
    a: "They get a link to cancel themselves. Cancel outside your notice window (24 hours by default) and a card deposit refunds automatically. Inside it, you keep the deposit.",
  },
  {
    q: "Can I limit where I travel?",
    a: "Yes. In Settings, list the areas you cover and the ZIP or postcode prefixes you accept. The booking form asks for the client's ZIP and turns away anything outside your area before they can book.",
  },
  {
    q: "Do clients need an account?",
    a: "No. They book as guests with their name and email, and get a confirmation with a calendar invite and a reminder the day before.",
  },
  {
    q: "Can I still take bookings by DM?",
    a: "Of course. Add them to your schedule and the slot disappears from your page so nobody double-books you.",
  },
  {
    q: "Where does the money go?",
    a: "Straight to you. Take card deposits on the page through your own Stripe account, or send clients to your own payment link (PayPal, Monzo, Revolut, Cash App) and confirm the deposit with one tap. GlideBook never holds or takes any of it.",
  },
];

/** A real booking page, embedded as it is. Nothing staged: it is the same page the business's clients use. */
export function LiveDemo({ host, slug, name, areas }: { host: string; slug: string; name: string; areas: string | null }) {
  return (
    <figure className="mx-auto w-full max-w-[380px] lg:mx-0">
      <div className="overflow-hidden rounded-xl border border-line-strong bg-bg">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11px] text-ink-muted">
          <span className="size-2 rounded-full border border-line-strong" aria-hidden />
          <span className="truncate">
            {host}/book/{slug}
          </span>
        </div>
        <iframe
          src={`/book/${slug}`}
          title={`${name} booking page`}
          loading="lazy"
          className="block h-[560px] w-full bg-bg"
        />
      </div>
      <figcaption className="mt-3 text-[13px] leading-relaxed text-ink-muted">
        {name}&apos;s actual page{areas ? `, taking bookings across ${areas}` : ""}. Scroll it, pick a package, try the form.{" "}
        <Link href={`/book/${slug}`} className="text-ink underline">
          Open full size
        </Link>
      </figcaption>
    </figure>
  );
}

export function HowItWorks() {
  return (
    <section className="mt-28 border-t border-line pt-10">
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <h2 className="text-2xl">How it works</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">Three steps. The first one is the only one that takes any time.</p>
        </div>
        <ol className="divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-2 py-6 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-6">
              <span className="font-display text-3xl leading-none text-ink-muted">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mt-28 border-t border-line pt-10">
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <h2 className="text-2xl">Questions</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">The ones every detailer asks in the first DM.</p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className={cn("flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium", isOpen ? "text-ink" : "text-ink hover:text-ink-muted")}
                >
                  {f.q}
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={spring.snappy} className="shrink-0 text-ink-muted">
                    <CaretDown className="size-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ ...spring.soft, opacity: { duration: 0.2 } }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-5 text-sm leading-relaxed text-ink-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
