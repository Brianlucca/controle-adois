import { TransactionInput } from "@/lib/finance/transaction-schema";

interface TransactionUser {
  uid: string;
  name?: string;
  email?: string;
}

export function buildBaseTransaction(
  data: TransactionInput,
  user: TransactionUser
) {
  return {
    ...data,
    userId: user.uid,
    userName: user.name || user.email || "Usuario",
    createdAt: new Date(),
    paidAt: data.status === "paid" ? new Date() : null,
    pixCode: data.pixCode || null,
    barCode: data.barCode || null,
    observation: data.observation || null,
    linkedInvestmentId: data.linkedInvestmentId || null,
    isRecurrent: data.isRecurrent || false,
    recurrenceMonths: data.isRecurrent ? data.recurrenceMonths : null,
  };
}

export function buildEditableTransactionFields(
  data: TransactionInput,
  linkedInvestmentId?: string | null
) {
  return {
    description: data.description,
    amount: data.amount,
    category: data.category,
    type: data.type,
    status: data.status,
    dueDate: data.dueDate,
    pixCode: data.pixCode || null,
    barCode: data.barCode || null,
    observation: data.observation || null,
    linkedInvestmentId: data.linkedInvestmentId || linkedInvestmentId || null,
    isRecurrent: data.isRecurrent || false,
    recurrenceMonths: data.isRecurrent ? data.recurrenceMonths : null,
    paidAt: data.status === "paid" ? new Date() : null,
  };
}
