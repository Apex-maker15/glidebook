import type { NextAuthConfig } from "next-auth";

/**
 * Database-free part of the NextAuth config so it can run in the proxy layer.
 * Providers that need Prisma are added in `auth.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.slug = user.slug;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "PROVIDER" | "CUSTOMER";
      session.user.slug = (token.slug as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
