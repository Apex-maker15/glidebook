import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const login = new URL("/login", req.nextUrl.origin);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    if (user.role !== "PROVIDER") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  if ((pathname === "/login" || pathname === "/register") && user?.role === "PROVIDER") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
