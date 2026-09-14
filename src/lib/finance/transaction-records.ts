import { TransactionInput } from "@/lib/finance/transaction-schema";
import type { TransactionStatus } from "@/lib/types";

interface TransactionUser {
  uid: string;
  name?: string;
  email?: string;
}

export function getStatusAfterDateChange(
  currentStatus: TransactionStatus,
  nextDate: string,
  todayKey: string,
): TransactionStatus {
  return nextDate > todayKey ? "pending" : currentStatus;
}

export function isFutureCompletedTransaction(
  status: TransactionStatus,
  dueDate: string,
  todayKey: string,
) {
  return status === "paid" && dueDate > todayKey;
}

export function getRecurringOccurrenceStatus(
  initialStatus: TransactionStatus,
  occurrenceIndex: number,
): TransactionStatus {
  return occurrenceIndex === 0 ? initialStatus : "pending";
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
    accountId: data.accountId || null,
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
    accountId: data.accountId || null,
    linkedInvestmentId: data.linkedInvestmentId || linkedInvestmentId || null,
    isRecurrent: data.isRecurrent || false,
    recurrenceMonths: data.isRecurrent ? data.recurrenceMonths : null,
    scope: data.scope || null,
    fundingSource: data.fundingSource || null,
    paidByUserId: data.paidByUserId || null,
    responsibleUserId: data.responsibleUserId || null,
    beneficiaryUserIds: data.beneficiaryUserIds || [],
    splitMethod: data.splitMethod || null,
    shares: data.shares || [],
    paidAt: data.status === "paid" ? new Date() : null,
  };
}
