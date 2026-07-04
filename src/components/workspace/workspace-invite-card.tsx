"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WorkspaceInviteCardProps = {
  copied: boolean;
  inviteCode?: string;
  isPersonal: boolean;
  onCopy: () => void;
};

export function WorkspaceInviteCard({
  copied,
  inviteCode,
  isPersonal,
  onCopy,
}: WorkspaceInviteCardProps) {
  return (
    <Card className="border-white/5 bg-[#1A1D24] md:col-span-1">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Código de Acesso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-lg border border-white/10 bg-[#0B0E14] p-5 text-center">
          <p className="font-mono text-3xl font-bold tracking-[0.2em] text-indigo-400">
            {inviteCode || "----"}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-12 w-full border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
          onClick={onCopy}
          disabled={!inviteCode}
        >
          {copied ? (
            <CheckCircle2 size={18} className="mr-2 text-emerald-400" />
          ) : (
            <Copy size={18} className="mr-2" />
          )}
          {copied ? "Copiado!" : "Copiar Código"}
        </Button>
        {isPersonal && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Espaço pessoal também pode ser compartilhado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
