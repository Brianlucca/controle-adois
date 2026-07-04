import { Dispatch, FormEvent, SetStateAction } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Plus,
  Repeat2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addMonthsToDateKey } from "@/lib/finance/date";
import { TransactionFormData, TransactionStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface TransactionFormModalContentProps {
  categories: string[];
  formData: TransactionFormData;
  isEditing: boolean;
  onFormDataChange: Dispatch<SetStateAction<TransactionFormData>>;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent) => void;
}

export function TransactionFormModalContent({
  categories,
  formData,
  isEditing,
  onFormDataChange,
  onCancelEdit,
  onSubmit,
}: TransactionFormModalContentProps) {
  const updateForm = (patch: Partial<TransactionFormData>) => {
    onFormDataChange((current) => ({ ...current, ...patch }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-2">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-[#0B0E14] p-1.5">
        <button
          type="button"
          onClick={() =>
            updateForm({
              type: "income",
              status: "paid",
              isRecurrent: false,
              recurrenceMonths: 12,
            })
          }
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all ${
            formData.type === "income"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
              : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
          }`}
        >
          <ArrowUpCircle size={17} />
          Entrada
        </button>
        <button
          type="button"
          onClick={() => updateForm({ type: "expense" })}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all ${
            formData.type === "expense"
              ? "bg-red-600 text-white shadow-lg shadow-red-900/20"
              : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
          }`}
        >
          <ArrowDownCircle size={17} />
          Saida
        </button>
      </div>

      <div
        className={`rounded-lg border p-4 ${
          formData.type === "income"
            ? "border-emerald-500/20 bg-emerald-500/[0.06]"
            : "border-red-500/20 bg-red-500/[0.05]"
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Descricao
            </span>
            <Input
              placeholder="Ex: Mercado, Salario..."
              value={formData.description}
              onChange={(event) =>
                updateForm({ description: event.target.value })
              }
              required
              className="input-dark h-12 rounded-lg border-white/10 bg-black/25 text-base focus:border-indigo-500/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Valor
            </span>
            <Input
              type="number"
              placeholder="0,00"
              value={formData.amount}
              onChange={(event) => updateForm({ amount: event.target.value })}
              required
              className="input-dark h-12 rounded-lg border-white/10 bg-black/25 font-mono text-lg font-bold focus:border-indigo-500/50"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Data
            </span>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(event) => updateForm({ dueDate: event.target.value })}
              required
              className="input-dark h-12 rounded-lg border-white/10 bg-black/25 focus:border-indigo-500/50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Categoria
            </span>
            <select
              className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={formData.category}
              onChange={(event) => updateForm({ category: event.target.value })}
            >
              {categories.slice(1).map((category) => (
                <option key={category} className="bg-slate-900">
                  {category}
                </option>
              ))}
            </select>
          </label>

          {formData.type === "expense" ? (
            <label className="space-y-1.5">
              <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Status
              </span>
              <select
                className="h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={formData.status}
                onChange={(event) =>
                  updateForm({
                    status: event.target.value as TransactionStatus,
                  })
                }
              >
                <option value="paid" className="bg-slate-900">
                  Ja Pago
                </option>
                <option value="pending" className="bg-slate-900">
                  Pendente
                </option>
              </select>
            </label>
          ) : (
            <div className="space-y-1.5">
              <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Status
              </span>
              <div className="flex h-12 items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 size={16} />
                Recebido
              </div>
            </div>
          )}
        </div>
      </div>

      {formData.type === "expense" && (
        <div className="space-y-4 rounded-lg border border-white/10 bg-[#0B0E14]/70 p-4">
          <button
            type="button"
            onClick={() => updateForm({ isRecurrent: !formData.isRecurrent })}
            className={`flex w-full flex-col gap-3 rounded-lg border p-3 text-left transition-all sm:flex-row sm:items-center sm:justify-between ${
              formData.isRecurrent
                ? "border-indigo-500/50 bg-indigo-500/15 shadow-lg shadow-indigo-950/20"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  formData.isRecurrent
                    ? "bg-indigo-500 text-white"
                    : "bg-black/20 text-slate-500"
                }`}
              >
                <Repeat2 size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">
                  Repetir mensalmente
                </span>
                <span className="block text-xs text-slate-400">
                  Cria lancamentos mensais a partir desta data.
                </span>
              </span>
            </span>

            <span
              className={`w-fit rounded-md px-3 py-1 text-xs font-bold ${
                formData.isRecurrent
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              {formData.isRecurrent ? "Ativado" : "Desativado"}
            </span>
          </button>

          {formData.isRecurrent && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Quantidade de meses
                  </span>
                  <select
                    value={formData.recurrenceMonths}
                    onChange={(event) =>
                      updateForm({
                        recurrenceMonths: Number(event.target.value),
                      })
                    }
                    className="mt-1 h-11 w-full rounded-lg border border-indigo-500/30 bg-[#0B0E14] px-3 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 sm:w-44"
                  >
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                    <option value={24}>24 meses</option>
                  </select>
                </label>
                <div className="text-xs text-indigo-200">
                  Serao criados {formData.recurrenceMonths} lancamentos.
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({
                  length: Math.min(4, formData.recurrenceMonths),
                }).map((_, index) => (
                  <span
                    key={index}
                    className="rounded-md bg-black/20 px-2.5 py-1 text-[11px] font-bold text-indigo-100"
                  >
                    {formatDate(addMonthsToDateKey(formData.dueDate, index))}
                  </span>
                ))}
                {formData.recurrenceMonths > 4 && (
                  <span className="rounded-md bg-black/20 px-2.5 py-1 text-[11px] font-bold text-indigo-100">
                    +{formData.recurrenceMonths - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Codigo Pix (Copia e Cola)"
              value={formData.pixCode}
              onChange={(event) => updateForm({ pixCode: event.target.value })}
              className="input-dark h-12 rounded-lg border-white/10 bg-black/25 font-mono text-xs"
            />
            <Input
              placeholder="Codigo de Barras (Boleto)"
              value={formData.barCode}
              onChange={(event) => updateForm({ barCode: event.target.value })}
              className="input-dark h-12 rounded-lg border-white/10 bg-black/25 font-mono text-xs"
            />
          </div>
          <Textarea
            placeholder="Observacoes opcionais..."
            value={formData.observation}
            onChange={(event) =>
              updateForm({ observation: event.target.value })
            }
            className="input-dark min-h-[96px] rounded-lg border-white/10 bg-black/25"
          />
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-white/10 bg-[#10141D]/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end">
        {isEditing && (
          <Button
            type="button"
            className="h-12 rounded-lg border border-white/10 bg-slate-800 px-5 font-bold text-white hover:bg-slate-700 sm:min-w-32"
            onClick={onCancelEdit}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className={`h-12 rounded-lg px-5 text-sm font-bold text-white shadow-lg sm:min-w-44 ${
            formData.type === "income"
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20"
              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20"
          }`}
        >
          {isEditing ? (
            <>
              <Save size={18} className="mr-2" /> Salvar alteracoes
            </>
          ) : (
            <>
              <Plus size={18} className="mr-2" /> Salvar movimentacao
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
