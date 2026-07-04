"use client";

import { Loader2, Save, Settings, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WorkspaceSettingsCardProps = {
  budget: string;
  name: string;
  saving: boolean;
  onBudgetChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
};

export function WorkspaceSettingsCard({
  budget,
  name,
  saving,
  onBudgetChange,
  onNameChange,
  onSave,
}: WorkspaceSettingsCardProps) {
  return (
    <Card className="border-white/5 bg-[#1A1D24]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Settings size={18} className="text-indigo-400" />
          Preferências
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full flex-1 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Nome de Exibição
            </label>
            <Input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="h-11 border-white/10 bg-slate-950 text-white"
            />
          </div>

          <div className="w-full flex-1 space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Target size={14} />
              Meta de Gastos (R$)
            </label>
            <Input
              type="number"
              value={budget}
              onChange={(event) => onBudgetChange(event.target.value)}
              className="h-11 border-white/10 bg-slate-950 font-mono text-white"
            />
          </div>

          <Button
            onClick={onSave}
            disabled={saving}
            className="h-11 w-full rounded-lg bg-indigo-600 px-6 hover:bg-indigo-700 md:w-auto"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
