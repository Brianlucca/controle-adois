"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceMember } from "@/components/workspace/types";

type WorkspaceMembersCardProps = {
  currentUserId?: string;
  isOwner: boolean;
  members: WorkspaceMember[];
  onTogglePermission: (
    memberUid: string,
    field: string,
    currentValue: boolean
  ) => void;
};

export function WorkspaceMembersCard({
  currentUserId,
  isOwner,
  members,
  onTogglePermission,
}: WorkspaceMembersCardProps) {
  return (
    <Card className="border-white/5 bg-[#1A1D24] md:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Membros ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member, index) => {
          const memberId = typeof member === "string" ? member : member.uid || "";
          const email = typeof member === "string" ? "" : member.email || "";
          const role = typeof member === "string" ? "member" : member.role;
          const canEdit = typeof member === "string" ? false : Boolean(member.canEdit);
          const memberName = email ? email.split("@")[0] : "Usuário";

          return (
            <div
              key={memberId || index}
              className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-bold text-white">
                  {(email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{memberName}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      role === "owner"
                        ? "bg-indigo-500/10 text-indigo-300"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {role === "owner" ? "Dono" : "Membro"}
                  </span>
                </div>
              </div>

              {isOwner && memberId !== currentUserId ? (
                <button
                  onClick={() =>
                    onTogglePermission(memberId, "canEdit", canEdit)
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                    canEdit
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {canEdit ? "Pode editar" : "Apenas ver"}
                </button>
              ) : (
                <span className="px-3 text-xs font-medium text-slate-500">
                  {canEdit ? "Editor" : "Visualizador"}
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
