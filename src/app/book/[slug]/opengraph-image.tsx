import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";
import { canTakeDeposits } from "@/lib/payments";

export const runtime = "nodejs";
export const alt = "Book online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT: Record<string, string> = {
  beauty: "#f472b6",
  hair: "#a78bfa",
  car: "#38bdf8",
  pet: "#fbbf24",
  neutral: "#8b7cff",
};

/**
 * Branded preview card for the booking link (Instagram bio, WhatsApp, iMessage).
 * Generated on the server per provider.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.user.findUnique({
    where: { slug },
    select: {
      businessName: true,
      category: true,
      depositPercent: true,
      currency: true,
      stripeAccountId: true,
      stripeAccountLive: true,
      stripeChargesEnabled: true,
      services: { where: { active: true }, orderBy: { sortOrder: "asc" }, take: 3, select: { name: true, priceCents: true } },
    },
  });

  const meta = CATEGORIES[p?.category ?? "OTHER"];
  const accent = ACCENT[meta.accent];
  const name = p?.businessName ?? "GlideBook";
  const services = p?.services ?? [];
  const deposit = !p || !canTakeDeposits(p) ? "pick a time in seconds" : p.depositPercent < 100 ? `${p.depositPercent}% deposit secures your slot` : "pay securely by card";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `radial-gradient(900px 500px at 0% 0%, ${accent}33, transparent 60%), #07080c`,
          color: "#f4f5f9",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: accent }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>GlideBook</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: "#9298a8" }}>{meta.tagline}</div>
          <div style={{ fontSize: name.length > 22 ? 64 : 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color: "#fff" }}>{name}</div>
          <div style={{ fontSize: 30, color: accent, marginTop: 6 }}>{`Book online - ${deposit}`}</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {services.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "14px 22px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                fontSize: 24,
              }}
            >
              <span>{s.name}</span>
              <span style={{ color: "#9298a8" }}>{formatMoney(s.priceCents, p?.currency ?? "gbp")}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
