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

export interface QueryExpensesPayload {
  queryType: 'total_spend' | 'recent_list' | 'budget_status';
  timeframe?: 'today' | 'this_week' | 'this_month' | 'all';
  categoryId?: number;
  budgetId?: number;
  limit?: number;
}

export interface UpdateExpensePayload {
  targetExpenseId: number;
  amount?: number;
  description?: string;
  categoryId?: number | null;
  budgetId?: number | null;
  spendingType?: 'needs' | 'wants';
  dateSpent?: string;
}

export interface DeleteExpensePayload {
  targetExpenseId: number;
  description?: string;
  amount?: number;
}

export interface ExpenseItem {
  id: number;
  amount: number;
  description: string | null;
  spending_type: string;
  date_spent: string;
  category_id: number | null;
  budget_id: number | null;
  created_at?: string | null;
}

export interface ClarificationPayload {
  question: string;
  missingEntity: 'amount' | 'description' | 'category' | 'budget' | 'target_expense';
  suggestedOptions?: string[];
}

export type AssistantChatAction =
  | 'record_expense'
  | 'query_expenses'
  | 'update_expense'
  | 'delete_expense'
  | 'ask_clarification';

export interface AssistantChatResponse {
  action: AssistantChatAction;
  payload:
    | RecordExpensePayload
    | QueryExpensesPayload
    | UpdateExpensePayload
    | DeleteExpensePayload
    | ClarificationPayload;
  transcript: string;
  ttsAudio?: string;
  spokenText?: string;
  error?: string;
}

export type MessageSender = 'user' | 'assistant' | 'system';
export type MessageType =
  | 'text'
  | 'clarification'
  | 'confirmation'
  | 'query_result'
  | 'update_proposal'
  | 'delete_proposal'
  | 'receipt'
  | 'error';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text?: string;
  timestamp: string;
  type: MessageType;
  clarification?: ClarificationPayload;
  proposal?: RecordExpensePayload;
  queryPayload?: QueryExpensesPayload;
  queryResults?: ExpenseItem[];
  totalAmount?: number;
  updatePayload?: UpdateExpensePayload;
  deletePayload?: DeleteExpensePayload;
  status?: 'pending' | 'confirmed' | 'cancelled';
  error?: string;
}
