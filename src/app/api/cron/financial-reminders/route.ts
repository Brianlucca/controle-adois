import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 3);
  const todayKey = getBahiaDateKey(today);
  const endKey = getBahiaDateKey(end);
  try {
    const bills = await adminDb.collectionGroup("transactions")
      .where("dueDate", ">=", todayKey).where("dueDate", "<=", endKey).get();
    const pendingByWorkspace = new Map<string, typeof bills.docs>();
    bills.docs.forEach((doc) => {
      const data = doc.data();
      const workspaceId = doc.ref.parent.parent?.id;
      if (!workspaceId || data.type !== "expense" || data.status !== "pending") return;
      pendingByWorkspace.set(workspaceId, [...(pendingByWorkspace.get(workspaceId) || []), doc]);
    });
    let sent = 0;

    for (const [workspaceId, pending] of pendingByWorkspace) {
      const workspaceDoc = await adminDb.collection("workspaces").doc(workspaceId).get();
      if (!workspaceDoc.exists) continue;
      const workspace = workspaceDoc.data() || {};
    if (pending.length === 0) continue;

    const memberIds = [...new Set([workspace.ownerId, ...(workspace.memberIds || []),
      ...(workspace.members || []).map((member: { uid?: string }) => member.uid),
    ].filter(Boolean))] as string[];
    const users = await Promise.all(memberIds.map((uid) => adminDb.collection("users").doc(uid).get()));
    const tokens = [...new Set(users.flatMap((doc) => doc.data()?.notificationTokens || []))] as string[];
    if (tokens.length === 0) continue;

    const dueToday = pending.filter((doc) => doc.data().dueDate === todayKey).length;
    const response = await adminMessaging.sendEachForMulticast({
      tokens: tokens.slice(0, 500),
      notification: {
        title: dueToday ? `${dueToday} conta(s) vencem hoje` : "Próximos vencimentos",
        body: `${pending.length} conta(s) exigem atenção em ${workspace.name || "seu espaço"}.`,
      },
      webpush: { fcmOptions: { link: "/dashboard/payments" } },
      data: { url: "/dashboard/payments" },
    });
    sent += response.successCount;
    }

    return NextResponse.json({ success: true, sent, date: todayKey });
  } catch (error) {
    console.error("financial-reminders failed", error);
    return NextResponse.json({ error: "notification_service_unavailable" }, { status: 503 });
  }
}

function getBahiaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
