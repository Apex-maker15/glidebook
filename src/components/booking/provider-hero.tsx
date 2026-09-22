"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, At, MapPin, Phone, ShieldCheck } from "@/components/icons";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { spring } from "@/components/motion";
import { initials } from "@/lib/utils";
import type { ProviderDTO } from "@/types";

/**
 * The top of a provider's public page: cover, logo, name, one-liner and the
 * facts a client wants before booking. Everything here is the provider's own
 * brand; GlideBook stays a small mark in the corner.
 */
export function ProviderHero({ provider }: { provider: ProviderDTO }) {
  const meta = CATEGORIES[provider.category];
  const where =
    provider.locationMode === "MOBILE"
      ? provider.serviceAreas
        ? `We come to you · ${provider.serviceAreas}`
        : "We come to you"
      : provider.studioAddress
        ? provider.studioAddress
        : "In studio";

  const scrollToBooking = () => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 sm:px-6">
        <Link href="/" className="text-[12px] font-medium text-ink-muted transition-colors hover:text-ink">
          Booking page by GlideBook
        </Link>
        <div className="flex items-center gap-3">
          {provider.takesDeposits && (
            <span className="hidden items-center gap-1.5 text-[12px] text-ink-muted sm:flex">
              <ShieldCheck className="size-3.5" /> Card payments by Stripe
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
          className="relative h-44 overflow-hidden rounded-3xl border border-line sm:h-64"
          style={
            provider.coverData
              ? { backgroundImage: `url(${provider.coverData})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "var(--accent)" }
          }
        />

        <div className="relative flex flex-col gap-5 px-2 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <div className="flex items-end gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.gentle, delay: 0.08 }}
              className="-mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-bg bg-surface text-xl font-semibold sm:-mt-14 sm:size-28"
            >
              {provider.logoData ? (
                // eslint-disable-next-line @next/next/no-img-element -- inline data URL, no optimisation possible
                <img src={provider.logoData} alt={`${provider.businessName} logo`} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center bg-accent-soft text-accent-strong">
                  {initials(provider.businessName) || <CategoryIcon category={provider.category} className="size-8" />}
                </span>
              )}
            </motion.div>
            <div className="pb-1">
              <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-muted">{meta.tagline}</p>
              <h1 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">{provider.businessName}</h1>
              {provider.tagline && <p className="mt-1 max-w-xl text-[15px] text-ink-muted">{provider.tagline}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToBooking}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-6 text-sm font-semibold text-black sm:mb-1"
          >
            Book now <ArrowDown className="size-4" />
          </button>
        </div>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 px-2 text-[13px] text-ink-muted sm:px-5">
          <li className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-accent-strong" /> {where}
          </li>
          {provider.instagram && (
            <li>
              <a
                href={`https://instagram.com/${provider.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-ink"
              >
                <At className="size-3.5 shrink-0 text-accent-strong" /> {provider.instagram} on Instagram
              </a>
            </li>
          )}
          {provider.phone && (
            <li>
              <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 transition-colors hover:text-ink">
                <Phone className="size-3.5 shrink-0 text-accent-strong" /> {provider.phone}
              </a>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
