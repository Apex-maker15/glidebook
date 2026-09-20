import { prisma } from "@/lib/prisma";
import type { ReviewSummary } from "@/types";

/** Average, count and the latest few reviews for a provider's public page. */
export async function reviewSummaryFor(providerId: string, latest = 4): Promise<ReviewSummary> {
  const [agg, rows] = await Promise.all([
    prisma.review.aggregate({ where: { providerId }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: latest,
      select: { id: true, rating: true, text: true, clientName: true, createdAt: true },
    }),
  ]);
  return {
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count._all,
    latest: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}
