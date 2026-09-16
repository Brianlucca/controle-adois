export type BudgetScope = "shared" | "individual";
export type BudgetHealth = "healthy" | "attention" | "critical" | "exceeded";
export type BudgetAlertThreshold = 0 | 50 | 75 | 90 | 100;

export interface FinancialBudget {
  id: string;
  categoryId: string;
  category: string;
  categoryAliases: string[];
  limitCents: number;
  scope: BudgetScope;
  participantUserId: string | null;
  responsibleUserId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
}

export interface FinancialBudgetInput {
  categoryId: string;
  category: string;
  limitAmount: number;
  scope: BudgetScope;
  participantUserId?: string | null;
  responsibleUserId: string;
}

export interface ParticipantBudgetUsage {
  userId: string;
  spentCents: number;
  pendingCents: number;
}

export interface BudgetUsage {
  budget: FinancialBudget;
  spentCents: number;
  pendingCents: number;
  projectedCents: number;
  remainingCents: number;
  projectedRemainingCents: number;
  usedPercentage: number;
  projectedPercentage: number;
  cycleProgressPercentage: number;
  remainingCycleDays: number;
  suggestedDailyCents: number;
  threshold: BudgetAlertThreshold;
  health: BudgetHealth;
  participantUsage: ParticipantBudgetUsage[];
}
