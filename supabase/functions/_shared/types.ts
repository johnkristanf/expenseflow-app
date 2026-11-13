export interface ExpenseDraft {
  amount?: number;
  description?: string;
  categoryId?: number;
  budgetId?: number;
  spendingType?: "needs" | "wants";
  dateSpent?: string;
}

export interface Category {
  id: number;
  name: string;
  notes?: string | null;
}

export interface Budget {
  id: number;
  name: string;
  current_amount: number;
  total_amount: number;
}

export interface RecentExpense {
  description: string | null;
  category_id: number | null;
  budget_id: number | null;
}

export type AffinityMap = Record<string, { categoryId?: number | null; budgetId?: number | null }>;

export interface UserFinancialContext {
  categories: Category[];
  budgets: Budget[];
  affinityMap: AffinityMap;
}

export interface AssistantReasoningResult {
  action: "record_expense" | "ask_clarification";
  payload: Record<string, any>;
  spokenText: string;
}

export interface AssistantChatResponse {
  action: "record_expense" | "ask_clarification";
  payload: Record<string, any>;
  transcript: string;
  ttsAudio: string;
  spokenText: string;
}
