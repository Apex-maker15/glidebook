import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "PROVIDER" | "CUSTOMER";
      slug: string | null;
    };
  }
  interface User {
    role: "PROVIDER" | "CUSTOMER";
    slug: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "PROVIDER" | "CUSTOMER";
    slug?: string | null;
  }
}
