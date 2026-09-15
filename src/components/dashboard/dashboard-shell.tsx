"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { CalendarClock, Check, Copy, ExternalLink, LogOut, Settings, Sparkles, Wrench, LayoutDashboard } from "lucide-react";
import { spring } from "@/components/motion";
import { useToastStore } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Schedule", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: Wrench },
  { href: "/dashboard/availability", label: "Availability", icon: CalendarClock },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface Props {
  businessName: string;
  slug: string;
  children: React.ReactNode;
}

export function DashboardShell({ businessName, slug, children }: Props) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const push = useToastStore((s) => s.push);

  const bookingUrl = typeof window !== "undefined" ? `${window.location.origin}/book/${slug}` : `/book/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      push({ tone: "info", title: "Your booking link", description: bookingUrl });
    }
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#07080c]/80 px-4 py-3 backdrop-blur-xl lg:h-dvh lg:self-start lg:flex-col lg:items-stretch lg:justify-start lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent-strong">
            <Sparkles className="size-4" />
          </span>
          <span className="hidden sm:inline">GlideBook</span>
        </Link>

        <nav className="flex gap-1 lg:mt-8 lg:flex-col" aria-label="Dashboard">
          {NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {active && <motion.span layoutId="nav-active" transition={spring.morph} className="absolute inset-0 rounded-xl bg-white/[0.08]" />}
                <Icon className="relative size-4" />
                <span className="relative hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:mt-auto lg:block">
          <div className="glass rounded-2xl p-3">
            <p className="truncate text-[13px] font-semibold">{businessName}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">/book/{slug}</p>
            <div className="mt-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] text-[12px] font-medium transition-colors hover:bg-white/10"
              >
                {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <Link
                href={`/book/${slug}`}
                target="_blank"
                className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06] transition-colors hover:bg-white/10"
                aria-label="Open booking page"
              >
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" onClick={() => void copyLink()} aria-label="Copy booking link" className="rounded-lg p-2 text-ink-muted hover:bg-white/[0.08] hover:text-ink">
            {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
          </button>
          <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} aria-label="Sign out" className="rounded-lg p-2 text-ink-muted hover:bg-white/[0.08] hover:text-ink">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
