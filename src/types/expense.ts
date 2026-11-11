export interface ExpenseDraft {
  amount?: number;
  description?: string;
  categoryId?: number | null;
  budgetId?: number | null;
  spendingType?: 'needs' | 'wants';
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
  current_amount: number | string;
  total_amount: number | string;
}

export interface RecordExpensePayload {
  amount: number;
  description: string;
  spendingType: 'needs' | 'wants';
  dateSpent: string;
  categoryId?: number | null;
  budgetId?: number | null;
  userId?: string;
}

export interface ClarificationPayload {
  question: string;
  missingEntity: 'amount' | 'description' | 'category' | 'budget';
  suggestedOptions?: string[];
}

export type AssistantChatAction = 'record_expense' | 'ask_clarification';

export interface AssistantChatResponse {
  action: AssistantChatAction;
  payload: RecordExpensePayload | ClarificationPayload;
  transcript: string;
  ttsAudio?: string;
  spokenText?: string;
  error?: string;
}
