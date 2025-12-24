"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

export async function createSession(idToken: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    if (!decodedToken) {
      return { success: false, error: "Token inválido" };
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    
    const cookieStore = await cookies();
    
    cookieStore.set("__session", idToken, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Falha na autenticação" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");

  redirect("/auth/login");
}

export async function recordTermsAcceptance(userId: string, userAgent?: string) {
  try {
    const db = getFirestore();

    const acceptanceData = {
      userId,
      acceptedAt: new Date(),
      userAgent: userAgent || 'Unknown',
      termsVersion: '1.0',
      accepted: true
    };

    await db.collection('terms_acceptances').add(acceptanceData);

    return { success: true };
  } catch (error) {
    return { success: false, error: "Falha ao registrar aceitação" };
  }
}

export async function getTermsAcceptances() {
  try {
    const db = getFirestore();

    const snapshot = await db.collection('terms_acceptances')
      .orderBy('acceptedAt', 'desc')
      .get();

    const acceptances = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      acceptedAt: doc.data().acceptedAt.toDate()
    }));

    return { success: true, data: acceptances };
  } catch (error) {
    return { success: false, error: "Falha ao buscar dados" };
  }
}