import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">That page does not exist</h1>
      <Link href="/" className="text-sm text-accent-strong underline-offset-4 hover:underline">
        Back to GlideBook
      </Link>
    </main>
  );
}
