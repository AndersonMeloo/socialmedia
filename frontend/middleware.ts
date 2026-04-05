import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "./app/lib/auth-client";

const publicRoutes = ["/login", "/cadastro", "/auth/google/callback"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".");

  if (isAsset) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token && !isPublicRoute) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  if (token && isPublicRoute) {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
