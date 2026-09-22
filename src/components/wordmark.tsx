import Link from "next/link";
import { cn } from "@/lib/utils";

/** The GlideBook name set in the display face. No mark, no icon: the word is the logo. */
export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("font-display text-[19px] font-semibold leading-none tracking-tight text-ink", className)}>
      GlideBook
    </Link>
  );
}
