import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("__session");
  const path = request.nextUrl.pathname;

  if (session && path.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!session && path.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};