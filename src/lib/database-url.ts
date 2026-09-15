/**
 * Resolve a plain `postgres://` connection string for the pg driver.
 *
 * Hosted integrations differ: Neon/Supabase put a TCP URL in DATABASE_URL, while
 * Vercel's Prisma Postgres integration sets DATABASE_URL to a `prisma+postgres://`
 * URL (used by the Prisma CLI for migrations) and the TCP URL in POSTGRES_URL.
 */
export function databaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DIRECT_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  return candidates.find((u) => u && /^postgres(ql)?:\/\//.test(u));
}
