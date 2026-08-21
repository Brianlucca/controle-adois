export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  createdAt: string;
}

export interface AssistantMessage {
  id: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  body: string;
  action?: string;
}
