"use client";

import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WorkspaceCreateJoinProps = {
  inviteCode: string;
  loading: boolean;
  newWorkspaceName: string;
  onCreate: () => void;
  onInviteCodeChange: (value: string) => void;
  onJoin: () => void;
  onNewWorkspaceNameChange: (value: string) => void;
};

export function WorkspaceCreateJoin({
  inviteCode,
  loading,
  newWorkspaceName,
  onCreate,
  onInviteCodeChange,
  onJoin,
  onNewWorkspaceNameChange,
}: WorkspaceCreateJoinProps) {
  return (
    <section className="border-t border-white/5 pt-2">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-dashed border-white/10 bg-[#121722] p-4 transition-colors hover:bg-[#1A1D24]">
          <div className="mb-2 flex items-center gap-2 font-bold text-white">
            <Plus size={20} className="text-indigo-500" />
            Criar Novo Grupo
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Crie um espaço para compartilhar finanças.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Nome do grupo..."
              value={newWorkspaceName}
              onChange={(event) => onNewWorkspaceNameChange(event.target.value)}
              className="h-11 border-white/10 bg-slate-950 text-white"
            />
            <Button
              className="h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 sm:w-14"
              onClick={onCreate}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-white/10 bg-[#121722] p-4 transition-colors hover:bg-[#1A1D24]">
          <div className="mb-2 flex items-center gap-2 font-bold text-white">
            <Users size={20} className="text-emerald-500" />
            Entrar com Código
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Insira o código de convite de 6 dígitos.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="XY99ZZ"
              className="h-11 border-white/10 bg-slate-950 font-mono uppercase tracking-widest text-white"
              maxLength={6}
              value={inviteCode}
              onChange={(event) => onInviteCodeChange(event.target.value.toUpperCase())}
            />
            <Button
              variant="outline"
              className="h-11 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white sm:w-24"
              onClick={onJoin}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
