import { Dispatch, FormEvent, SetStateAction } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Repeat2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseAllocationFields } from "@/components/finance/expense-allocation-fields";
import type { WorkspaceParticipant } from "@/contexts/workspace-context";
import { addMonthsToDateKey, getLocalDateKey } from "@/lib/finance/date";
import { getStatusAfterDateChange } from "@/lib/finance/transaction-records";
import type { FinancialAccountOption } from "@/lib/finance/account-types";
import { TransactionFormData, TransactionStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface TransactionFormModalContentProps {
  categories: string[];
  accountOptions: FinancialAccountOption[];
  participants: WorkspaceParticipant[];
  formData: TransactionFormData;
  isEditing: boolean;
  onFormDataChange: Dispatch<SetStateAction<TransactionFormData>>;
  onCancelEdit: () => void;
  onSubmit: (event: FormEvent) => void;
}

export function TransactionFormModalContent({
  categories,
  accountOptions,
  participants,
  formData,
  isEditing,
  onFormDataChange,
  onCancelEdit,
  onSubmit,
}: TransactionFormModalContentProps) {
  const todayKey = getLocalDateKey(new Date());
  const isScheduledForFuture = formData.dueDate > todayKey;
  const updateForm = (patch: Partial<TransactionFormData>) => {
    onFormDataChange((current) => ({ ...current, ...patch }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-2 text-[#2b2c31]">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#e2e0e3] bg-[#f5f4f6] p-1.5">
        <button
          type="button"
          onClick={() =>
            updateForm({
              type: "income",
              isRecurrent: false,
              recurrenceMonths: 12,
            })
          }
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-md text-sm font-bold transition-all ${
            formData.type === "income"
              ? "bg-white text-[#168267] shadow-sm ring-1 ring-[#cdebe0]"
              : "text-[#92949b] hover:bg-white/60 hover:text-[#4b4d54]"
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
              ? "bg-white text-[#cb554a] shadow-sm ring-1 ring-[#f2d0cb]"
              : "text-[#92949b] hover:bg-white/60 hover:text-[#4b4d54]"
          }`}
        >
          <ArrowDownCircle size={17} />
          Saída
        </button>
      </div>

      <div
        className={`rounded-lg border p-4 ${
          formData.type === "income"
            ? "border-[#cce9de] bg-[#f2faf7]"
            : "border-[#f0d3cf] bg-[#fff8f6]"
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Descrição
            </span>
            <Input
              placeholder="Ex: Mercado, Salario..."
              value={formData.description}
              onChange={(event) =>
                updateForm({ description: event.target.value })
              }
              required
              className="h-12 rounded-xl border-[#dedce1] bg-white text-base text-[#292a30]"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Valor
            </span>
            <CurrencyInput
              placeholder="0,00"
              value={formData.amount}
              onValueChange={(amount) => updateForm({ amount })}
              required
              className="h-12 rounded-xl border-[#dedce1] bg-white font-mono text-lg font-bold text-[#292a30]"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Data
            </span>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(event) => {
                const dueDate = event.target.value;
                updateForm({
                  dueDate,
                  status: getStatusAfterDateChange(
                    formData.status,
                    dueDate,
                    todayKey,
                  ),
                });
              }}
              required
              className="h-12 rounded-xl border-[#dedce1] bg-white text-[#292a30]"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Categoria
            </span>
            <select
              className="h-12 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm text-[#292a30] outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
              value={formData.category}
              onChange={(event) => updateForm({ category: event.target.value })}
            >
              {categories.slice(1).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Conta
            </span>
            <select
              className="h-12 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm text-[#292a30] outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
              value={formData.accountId || ""}
              onChange={(event) => {
                const accountId = event.target.value;
                const account = accountOptions.find(
                  (option) => option.id === accountId,
                );
                const currentUserId =
                  participants.find((participant) => participant.isCurrentUser)
                    ?.userId || participants[0]?.userId || "";
                updateForm({
                  accountId,
                  fundingSource:
                    account?.ownership === "joint" ? "joint" : "participant",
                  paidByUserId:
                    account?.ownership === "joint"
                      ? undefined
                      : account?.ownerUserId ||
                        formData.paidByUserId ||
                        currentUserId,
                });
              }}
            >
              <option value="">Sem conta vinculada</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.institutionName ? ` · ${account.institutionName}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block pl-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Status
            </span>
            <select
              className="h-12 w-full rounded-xl border border-[#dedce1] bg-white px-3 text-sm text-[#292a30] outline-none focus:border-[#8c86ec] focus:ring-2 focus:ring-[#635bff]/15"
              value={formData.status}
              onChange={(event) => {
                const status = event.target.value as TransactionStatus;
                updateForm({
                  status: getStatusAfterDateChange(
                    status,
                    formData.dueDate,
                    todayKey,
                  ),
                });
              }}
            >
              <option value="paid" disabled={isScheduledForFuture}>
                {formData.type === "income" ? "Recebido" : "Já pago"}
              </option>
              <option value="pending">
                {formData.type === "income" ? "A receber" : "A pagar"}
              </option>
            </select>
            <span className="block pl-1 text-[11px] leading-4 text-[#858891]">
              {isScheduledForFuture
                ? "Data futura: ficará pendente. Na data, confirme para atualizar o saldo da conta."
                : "Somente valores concluídos alteram o saldo da conta."}
            </span>
          </label>
        </div>
      </div>

      {formData.type === "expense" && (
        <div className="space-y-4 rounded-xl border border-[#e3e1e4] bg-[#faf9fb] p-4">
          <ExpenseAllocationFields
            formData={formData}
            participants={participants}
            accountOptions={accountOptions}
            onChange={updateForm}
          />

          <button
            type="button"
            onClick={() => updateForm({ isRecurrent: !formData.isRecurrent })}
            className={`flex w-full flex-col gap-3 rounded-lg border p-3 text-left transition-all sm:flex-row sm:items-center sm:justify-between ${
              formData.isRecurrent
                ? "border-[#c9c5ff] bg-[#f1efff]"
                : "border-[#e3e1e4] bg-white hover:border-[#cbc8d0]"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  formData.isRecurrent
                    ? "bg-indigo-500 text-white"
                    : "bg-[#f2f1f4] text-[#888a92]"
                }`}
              >
                <Repeat2 size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#292a30]">
                  Repetir mensalmente
                </span>
                <span className="block text-xs text-[#858891]">
                  Cria lançamentos mensais a partir desta data.
                </span>
              </span>
            </span>

            <span
              className={`w-fit rounded-md px-3 py-1 text-xs font-bold ${
                formData.isRecurrent
                  ? "bg-indigo-500 text-white"
                  : "bg-[#f2f1f4] text-[#858891]"
              }`}
            >
              {formData.isRecurrent ? "Ativado" : "Desativado"}
            </span>
          </button>

          {formData.isRecurrent && (
            <div className="rounded-lg border border-[#d7d2ff] bg-[#f3f1ff] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5d55dd]">
                    Quantidade de meses
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.recurrenceMonths}
                    onChange={(event) =>
                      updateForm({
                        recurrenceMonths: Number(event.target.value),
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-[#cbc7fa] bg-white px-3 text-sm text-[#292a30] outline-none focus:ring-2 focus:ring-[#635bff]/15 sm:w-44"
                  />
                </label>
                <div className="text-xs text-[#716bb8]">
                  Serão criados {formData.recurrenceMonths} lançamentos.
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({
                  length: Math.min(4, formData.recurrenceMonths),
                }).map((_, index) => (
                  <span
                    key={index}
                    className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-[#635bff]"
                  >
                    {formatDate(addMonthsToDateKey(formData.dueDate, index))}
                  </span>
                ))}
                {formData.recurrenceMonths > 4 && (
                  <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-[#635bff]">
                    +{formData.recurrenceMonths - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Código Pix (Copia e Cola)"
              value={formData.pixCode}
              onChange={(event) => updateForm({ pixCode: event.target.value })}
              className="h-12 rounded-xl border-[#dedce1] bg-white font-mono text-xs text-[#292a30]"
            />
            <Input
              placeholder="Código de barras (boleto)"
              value={formData.barCode}
              onChange={(event) => updateForm({ barCode: event.target.value })}
              className="h-12 rounded-xl border-[#dedce1] bg-white font-mono text-xs text-[#292a30]"
            />
          </div>
          <Textarea
            placeholder="Observações opcionais..."
            value={formData.observation}
            onChange={(event) =>
              updateForm({ observation: event.target.value })
            }
            className="min-h-[96px] rounded-xl border-[#dedce1] bg-white text-[#292a30]"
          />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-[#e6e3e7] pt-4 sm:flex-row sm:justify-end">
        {isEditing && (
          <Button
            type="button"
            className="h-12 rounded-xl border border-[#dedce1] bg-white px-5 font-bold text-[#4b4d54] hover:bg-[#f5f4f6] sm:min-w-32"
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
