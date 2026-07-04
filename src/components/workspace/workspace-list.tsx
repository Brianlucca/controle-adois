"use client";

import { ArrowRightLeft, Briefcase, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  WorkspaceDetails,
  WorkspaceListItem,
} from "@/components/workspace/types";

type WorkspaceListProps = {
  activeWorkspace: WorkspaceDetails | null;
  loading: boolean;
  workspaces: WorkspaceListItem[];
  onActivate: (workspaceId: string) => void;
  onMakePersonal: (workspaceId: string) => void;
};

export function WorkspaceList({
  activeWorkspace,
  loading,
  workspaces,
  onActivate,
  onMakePersonal,
}: WorkspaceListProps) {
  return (
    <section>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => {
          const isActive = activeWorkspace?.id === workspace.id;
          const isPersonal = workspace.type === "personal";

          return (
            <Card
              key={workspace.id}
              className={`relative overflow-hidden bg-[#121722] transition-all ${
                isActive
                  ? "border-indigo-500/70 shadow-lg shadow-indigo-900/20"
                  : "border-white/10 hover:bg-[#20242D]"
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${
                      isPersonal
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-purple-500/10 text-purple-400"
                    }`}
                  >
                    {isPersonal ? <User size={24} /> : <Briefcase size={24} />}
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <h3 className="mb-1 flex min-w-0 items-center gap-2 text-lg font-bold leading-tight text-white">
                      <span className="truncate">{workspace.name}</span>
                      {isPersonal && <Lock size={14} className="text-slate-500" />}
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      {isPersonal ? "Pessoal" : "Compartilhado"}
                    </p>
                  </div>

                  {isActive && (
                    <div className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-[10px] font-bold text-white shadow-lg shadow-indigo-950/30">
                      ATIVO
                    </div>
                  )}
                </div>

                {(!isActive || (workspace.isOwner && !isPersonal)) && (
                  <div className="mt-5 space-y-2">
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onActivate(workspace.id)}
                        disabled={loading}
                        className="h-11 w-full border-white/10 bg-white/5 text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <ArrowRightLeft size={16} className="mr-2" />
                        )}
                        Ativar agora
                      </Button>
                    )}

                    {workspace.isOwner && !isPersonal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMakePersonal(workspace.id)}
                        disabled={loading}
                        className="h-11 w-full border-blue-500/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white"
                      >
                        <User size={16} className="mr-2" />
                        Tornar meu espaço pessoal
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
