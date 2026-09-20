"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { spring } from "@/components/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: "01", title: "Add your packages", body: "Gold, Platinum, Diamond - by vehicle size, with your prices and how long each takes. Or paste your price list and we set it up for you, free." },
  { n: "02", title: "Drop the link in your bio", body: "Your page shows only the times you actually have free, only to clients inside the areas you cover, with a travel buffer between jobs." },
  { n: "03", title: "Deposits land before you drive", body: "Clients pay to lock the slot - by card on the page, or through your own payment link. Late cancellations keep the deposit." },
];

const FAQ = [
  { q: "Is it really free?", a: "Yes. GlideBook takes nothing: no monthly fee, no commission, no setup charge. If you take card deposits through Stripe, Stripe charges its usual card fee (about 1.5% + 20p in the UK) - that goes to Stripe, not to us." },
  { q: "How do deposits work?", a: "You choose a percentage - most detailers take 25-50%. The client pays it when booking, either by card on the page (your own Stripe) or through your own payment link; the rest is paid on the day however you like." },
  { q: "What if a client cancels?", a: "They get a link to cancel themselves. Cancel outside your notice window (24 hours by default) and the deposit refunds automatically. Inside it, you keep the deposit." },
  { q: "Can I limit where I travel?", a: "Yes. In Settings, list the areas you cover and the ZIP or postcode prefixes you accept. The booking form asks for the client's ZIP and turns away anything outside your area before they can book." },
  { q: "Do clients need an account?", a: "No. They book as guests with their name and email, and get a confirmation with a calendar invite and a reminder the day before." },
  { q: "Can I still take bookings by DM?", a: "Of course - just add them to your schedule and the slot disappears from your page so nobody double-books you." },
  { q: "Where does the money go?", a: "Straight to you. Take card deposits on the page through your own Stripe account, or send clients to your own payment link (PayPal, Monzo, Revolut, Stripe link) and confirm the deposit with one tap. GlideBook never holds or takes any of it." },
];

export function HowItWorks() {
  return (
    <section className="mt-24">
      <Reveal>
        <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-ink-muted">How it works</h2>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={0.08 * i}>
            <div className="glass h-full rounded-3xl p-6">
              <span className="text-[13px] font-semibold tracking-[0.2em] text-accent-strong">{s.n}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto mt-24 max-w-2xl">
      <Reveal>
        <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-ink-muted">Questions</h2>
      </Reveal>
      <div className="mt-6 space-y-2">
        {FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={0.04 * i}>
              <div className={cn("glass rounded-2xl transition-colors", isOpen && "bg-white/[0.06]")}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
                >
                  {f.q}
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={spring.snappy} className="shrink-0 text-ink-muted">
                    <ChevronDown className="size-4" />
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
                      <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
