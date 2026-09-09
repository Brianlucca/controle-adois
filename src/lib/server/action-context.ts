import "server-only";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
export { getValidatedActiveWorkspaceId } from "@/lib/server/workspace-session";

export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) return null;

    try {
      // The session cookie is created only after a revocation-aware ID-token check.
      // Verifying its signature locally keeps routine server actions from making an
      // extra Auth network request every time a screen loads.
      return await getAuth().verifySessionCookie(sessionCookie);
    } catch {
      return await getAuth().verifyIdToken(sessionCookie, true);
    }
  } catch {
    return null;
  }
}

export async function handleAuthFailure() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
  return { success: false, error: "unauthenticated" };
}
