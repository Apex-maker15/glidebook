import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

/**
 * Footer shared by the homepage, booking pages and the legal pages.
 * `poweredBy` is the booking-page variant: a one-line credit plus the legal links.
 */
export function SiteFooter({ poweredBy = false, className }: { poweredBy?: boolean; className?: string }) {
  return (
    <footer className={cn("mx-auto max-w-6xl px-4 text-[12px] text-ink-muted sm:px-6", className)}>
      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5", poweredBy && "justify-center")}>
        {poweredBy ? (
          <span>
            Booking page by{" "}
            <Link href="/?ref=book" className="font-medium text-ink hover:underline">
              GlideBook
            </Link>
            . Free for any appointment business.
          </span>
        ) : (
          <span className="font-display text-[15px] text-ink">GlideBook</span>
        )}
        <nav className="flex gap-4" aria-label="Legal">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        {!poweredBy && <span className="ml-auto">Made in the UK</span>}
      </div>
    </footer>
  );
}
