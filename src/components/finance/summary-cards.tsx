import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Transaction } from "@/lib/types";

interface SummaryCardsProps {
  transactions: Transaction[];
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = income - expense;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="relative overflow-hidden border-white/10 bg-[#121722]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Saldo Total
          </CardTitle>
          <Wallet className="h-5 w-5 text-indigo-300" />
        </CardHeader>
        <CardContent>
          <div
            className={`font-mono text-2xl font-bold ${
              balance < 0 ? "text-red-400" : "text-white"
            }`}
          >
            {formatCurrency(balance)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Balanço geral do workspace
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-emerald-500/15 bg-emerald-500/[0.07]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Entradas
          </CardTitle>
          <ArrowUpCircle className="h-5 w-5 text-emerald-300" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold text-emerald-300">
            {formatCurrency(income)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Total recebido</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-red-500/15 bg-red-500/[0.07]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Saídas
          </CardTitle>
          <ArrowDownCircle className="h-5 w-5 text-red-300" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold text-red-300">
            {formatCurrency(expense)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Total gasto</p>
        </CardContent>
      </Card>
    </div>
  );
}
