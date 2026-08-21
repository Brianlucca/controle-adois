import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consumeRateLimit, hasTrustedMutationOrigin, RateLimitEntry } from "@/lib/security/request-security";

const globalRateStore = globalThis as typeof globalThis & {
  controleRateLimits?: Map<string, RateLimitEntry>;
};
const rateLimits = globalRateStore.controleRateLimits ||= new Map();

export function proxy(request: NextRequest) {
  const session = request.cookies.get("__session")?.value;
  const path = request.nextUrl.pathname;
  const isMutation = request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS";
  const isServerAction = Boolean(request.headers.get("next-action"));

  if (isMutation && isServerAction && !hasTrustedMutationOrigin(
    request.headers.get("origin"),
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  )) {
    console.warn("security_event", { type: "invalid_origin", path });
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = session ? `session:${session.slice(-32)}` : `ip:${forwarded || "unknown"}`;
  const limit = path.startsWith("/auth") ? 20 : isMutation ? 90 : 300;
  const rate = consumeRateLimit(rateLimits, `${clientKey}:${isMutation ? "write" : "read"}`, limit, 60_000);
  if (!rate.allowed) {
    console.warn("security_event", { type: "rate_limit", path, authenticated: Boolean(session) });
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
    );
  }

  if (rateLimits.size > 10_000) {
    const now = Date.now();
    for (const [key, entry] of rateLimits) if (entry.resetAt <= now) rateLimits.delete(key);
  }

  if (session && path.startsWith("/auth")) return NextResponse.redirect(new URL("/dashboard", request.url));
  if (!session && path.startsWith("/dashboard")) return NextResponse.redirect(new URL("/auth/login", request.url));

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|firebase-messaging-sw.js|sw.js).*)"],
};
