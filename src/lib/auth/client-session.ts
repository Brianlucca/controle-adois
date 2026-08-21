export async function createClientSession(idToken: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return await response.json().catch(() => ({ success: false, error: "Resposta inválida do servidor." })) as { success: boolean; error?: string };
}
