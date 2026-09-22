import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { SiteFooter } from "@/components/site-footer";
import { LEGAL_UPDATED } from "@/lib/site";

/** Plain reading layout for /terms and /privacy. Numbered sections, no decoration. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div data-accent="neutral" className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-16 sm:px-6">
        <p className="text-[12px] uppercase tracking-[0.18em] text-ink-muted">Last updated {LEGAL_UPDATED}</p>
        <h1 className="mt-3 text-4xl">{title}</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">{intro}</p>
        <div className="legal mt-10 space-y-10 text-[15px] leading-relaxed">{children}</div>
      </main>
      <SiteFooter className="pb-10" />
    </div>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
        <span className="font-display text-ink-muted">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-ink-muted">{children}</div>
    </section>
  );
}
