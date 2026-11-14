# Design

## Context

The existing root page (`src/app/(tabs)/index.tsx`) hosts a full-screen conversational chat container and center-bottom microphone for recording expenses. To provide complete personal finance control, the conversational engine must support all CRUD operations (Create, Read, Update, Delete) directly through voice turns with immediate inline UI feedback and human-in-the-loop confirmation for all mutations.

The database tables (`expenses`, `budgets`, `categories`, `accounts`) exist in Supabase without custom stored procedures. The client interacts directly with these tables using the Supabase SDK.

## Goals / Non-Goals

**Goals:**
- **Create**: Keep existing expense logging via `record_expense` tool and inline confirmation card.
- **Read**: Support voice queries for spending totals, budget remaining balances, and recent transaction lists via a new `query_expenses` tool, rendering an inline `ExpenseListCard`.
- **Update**: Support voice modifications to past expenses via an `update_expense` tool, presenting an inline `ExpenseUpdateCard` that shows changes before committing to the database and adjusting budget balances.
- **Delete**: Support voice removal of expenses via a `delete_expense` tool, presenting an inline `ExpenseDeleteCard` with danger-style confirmation that refunds the deleted amount back to the associated budget.
- **Direct Database Execution**: All database operations (inserts, updates, selects, deletes) execute directly through the Supabase JavaScript client, requiring zero migrations or SQL functions.
- Maintain strict dark theme styling (`bg-slate-950`, `bg-slate-900`, `border-slate-800`, `cyan-400`, `rose-500`).

**Non-Goals:**
- Complex SQL analytics or arbitrary SQL generation (queries are structured around categories, date ranges, budgets, and recent lists).
- Multi-user budget sharing or simultaneous mutation locking (single-user personal finance app).

## Decisions

### Decision 1: Edge Function Tool Expansion
- **Choice**: Expand `ASSISTANT_TOOLS` in `supabase/functions/_shared/openai.ts` with:
  1. `record_expense`: Propose new expense (existing).
  2. `query_expenses`: Query spending totals, recent transactions, or budget status with filters: `timeframe` ('today' | 'week' | 'month' | 'all'), `categoryId`, `budgetId`, `limit`.
  3. `update_expense`: Propose modifying an existing expense, specifying `targetExpenseId` (or matching criteria), updated `amount`, `description`, `categoryId`, `budgetId`, `spendingType`.
  4. `delete_expense`: Propose deleting an expense, specifying `targetExpenseId` (or matching criteria like 'last').
  5. `ask_clarification`: Conversational question when intent or targets are ambiguous (existing).
- **Rationale**: OpenAI structured tool calling allows deterministic payload handling while natural language reasoning maps user intent to the correct action.

### Decision 2: Direct Client-Side Database Handlers
- **Choice**: Execute read, update, and delete actions directly in `useVoiceSession` and `useExpenseChat` using `supabase.from(...)`:
  - **Read**: `supabase.from('expenses').select('*, categories(name), budgets(name)').order('date_spent', { ascending: false }).limit(limit)`.
  - **Update**: `supabase.from('expenses').update({...}).eq('id', id)` + recalculate budget current amount delta.
  - **Delete**: Fetch expense amount & budgetId, `supabase.from('expenses').delete().eq('id', id)`, then if budgetId exists, increment `budgets.current_amount` by deleted amount.
- **Rationale**: Avoids any server migrations or stored procedures; works immediately with the existing database.

### Decision 3: Specialized Inline Chat Cards
- **Choice**: Create dedicated dark-theme components for each CRUD turn:
  - `ExpenseListCard`: Renders summary statistics (total spent, count) and a clean list of recent matching transactions.
  - `ExpenseUpdateCard`: Highlights proposed field changes with a green confirm button and cancel button.
  - `ExpenseDeleteCard`: Renders a red/rose warning card with expense details, refund notice, and "Delete Expense" button.
- **Rationale**: Keeps the user inside the natural chat stream while providing clear, interactive human-in-the-loop verification before destructive actions.

## Risks / Trade-offs

- **[Risk] Resolving the correct expense to edit or delete**
  → *Mitigation*: The Edge Function passes the recent 10 expenses in the prompt context so the AI can resolve phrases like "my last expense" or "the 250 pesos Starbucks" to exact `expenseId`s. If ambiguous, the AI triggers `ask_clarification`.

- **[Risk] Budget desynchronization on edit or delete**
  → *Mitigation*: When an expense is updated with a new amount, the difference (`newAmount - oldAmount`) is deducted from the budget. When an expense is deleted, the original amount is refunded back to the budget.
