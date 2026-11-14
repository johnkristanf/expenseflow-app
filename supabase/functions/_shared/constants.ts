import OpenAI from "openai";

export const ASSISTANT_TOOLS: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "record_expense",
    description: "Propose recording a new expense when amount and description are identified.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Expense amount" },
        description: { type: "string", description: "Clean merchant or item description" },
        spendingType: {
          type: "string",
          enum: ["needs", "wants"],
          description: "Whether this expense is a need or want",
        },
        dateSpent: { type: "string", description: "YYYY-MM-DD format" },
        categoryId: { type: "number", description: "Matched category ID from user's categories list" },
        budgetId: { type: "number", description: "Matched budget ID from user's budgets list (optional/nullable)" },
      },
      required: ["amount", "description", "spendingType", "dateSpent"],
    },
  },
  {
    type: "function",
    name: "query_expenses",
    description: "Query, list, or summarize expenses or budget status (e.g., 'How much did I spend on food this month?', 'Show recent expenses', 'What is my budget?').",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        queryType: {
          type: "string",
          enum: ["total_spend", "recent_list", "budget_status"],
          description: "Type of information user is querying",
        },
        timeframe: {
          type: "string",
          enum: ["today", "this_week", "this_month", "all"],
          description: "Time range filter for the query",
        },
        categoryId: { type: "number", description: "Filter by category ID if mentioned" },
        budgetId: { type: "number", description: "Filter by budget ID if mentioned" },
        limit: { type: "number", description: "Number of expenses to list (e.g. 5 or 10)" },
      },
      required: ["queryType"],
    },
  },
  {
    type: "function",
    name: "update_expense",
    description: "Propose modifying an existing expense (e.g., 'Change Starbucks to 220 pesos', 'Change category to Groceries').",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        targetExpenseId: { type: "number", description: "ID of the existing expense to modify, matched from recent expenses" },
        amount: { type: "number", description: "New amount (if updated)" },
        description: { type: "string", description: "New description (if updated)" },
        categoryId: { type: "number", description: "New category ID (if updated)" },
        budgetId: { type: "number", description: "New budget ID (if updated)" },
        spendingType: { type: "string", enum: ["needs", "wants"] },
        dateSpent: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["targetExpenseId"],
    },
  },
  {
    type: "function",
    name: "delete_expense",
    description: "Propose deleting an existing expense (e.g., 'Delete my last expense', 'Delete the 150 pesos coffee').",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        targetExpenseId: { type: "number", description: "ID of the existing expense to delete, matched from recent expenses" },
        description: { type: "string", description: "Description of the expense to delete for confirmation display" },
        amount: { type: "number", description: "Amount of the expense to delete for confirmation display" },
      },
      required: ["targetExpenseId"],
    },
  },
  {
    type: "function",
    name: "ask_clarification",
    description: "Ask a short question when amount, description, or category/budget is missing or ambiguous.",
    strict: false,
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "Short conversational question to speak to user" },
        missingEntity: { type: "string", enum: ["amount", "description", "category", "budget", "target_expense"] },
        suggestedOptions: {
          type: "array",
          items: { type: "string" },
          description: "Optional quick-choice options (e.g. category names)",
        },
      },
      required: ["question", "missingEntity"],
    },
  },
];
