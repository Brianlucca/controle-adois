import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { hasTrustedMutationOrigin } from "@/lib/security/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!hasTrustedMutationOrigin(request.headers.get("origin"), host)) {
    return NextResponse.json(
      { success: false, error: "Origem inválida." },
      { status: 403 },
    );
  }
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (
      typeof body.idToken !== "string" ||
      body.idToken.length < 100 ||
      body.idToken.length > 10_000
    ) {
      return NextResponse.json(
        { success: false, error: "Token inválido." },
        { status: 400 },
      );
    }
    const decoded = await adminAuth.verifyIdToken(body.idToken, true);
    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Verifique seu e-mail antes de entrar." },
        { status: 403 },
      );
    }
    const expiresIn = 7 * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "unknown";
    console.error("session_creation_failed", { code });
    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível iniciar a sessão. Verifique o Firebase Admin.",
      },
      { status: 503 },
    );
  }
}
