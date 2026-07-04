"use client";

import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkspaceDangerZoneProps = {
  isOwner: boolean;
  loading: boolean;
  onDelete: () => void;
  onLeave: () => void;
};

export function WorkspaceDangerZone({
  isOwner,
  loading,
  onDelete,
  onLeave,
}: WorkspaceDangerZoneProps) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5">
      <div className="flex items-center gap-3 border-b border-red-500/10 bg-red-500/10 p-5 text-red-400">
        <ShieldAlert size={20} />
        <h3 className="font-bold">Zona de Perigo</h3>
      </div>
      <div className="flex flex-col items-start justify-between gap-4 p-4 md:flex-row md:items-center">
        <div>
          <h4 className="text-lg font-bold text-white">
            {isOwner ? "Excluir Workspace" : "Sair do Grupo"}
          </h4>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            {isOwner
              ? "Esta ação é irreversível. Todos os dados financeiros e históricos serão apagados permanentemente."
              : "Você perderá acesso imediato a todas as transações deste grupo."}
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={isOwner ? onDelete : onLeave}
          disabled={loading}
          className="h-12 w-full rounded-lg bg-red-600 px-6 font-bold text-white hover:bg-red-700 md:w-auto"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 size={18} className="mr-2" />
          )}
          {isOwner ? "Excluir Definitivamente" : "Sair do Grupo"}
        </Button>
      </div>
    </div>
  );
}
