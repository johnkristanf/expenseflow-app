# Proposal

## Why

The root screen now hosts a dedicated full-screen conversational chat container and a center-bottom microphone for recording expenses. However, users also need full conversational lifecycle management (CRUD: Create, Read, Update, Delete) to inspect their past spending, correct mistakes, and remove invalid transactions by voice without leaving the conversational interface.

## What Changes

- **Conversational Read / Query**: Users can ask natural-language questions about their spending, budgets, and recent transactions (e.g., *"How much did I spend on Food this month?"*, *"What is my remaining Gym budget?"*, *"Show my recent expenses"*). The AI queries the database and renders formatted summary cards inline.
- **Conversational Update / Edit**: Users can modify existing expenses by voice (e.g., *"Change yesterday's Starbucks expense to 220 pesos"*, *"Move Walmart from Food to Groceries"*). The AI identifies the matching transaction, prepares a diff, and renders an inline update confirmation card for user verification before mutating the database.
- **Conversational Delete / Remove**: Users can delete an expense by voice (e.g., *"Delete my last expense"*, *"Remove the 150 pesos coffee"*). The AI finds the target expense and presents a danger-styled confirmation card before deleting the record and refunding any associated budget.
- **Enhanced Edge Function Tools**: Add `query_expenses`, `update_expense`, and `delete_expense` tools to the OpenAI toolset in `assistant-chat`.
- **Direct Database CRUD**: The client uses direct Supabase SDK table operations (`select`, `insert`, `update`, `delete`) against the existing database tables (`expenses`, `budgets`, `categories`).

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `voice-expense-recording`: Expands capability scope from create-only to full voice-driven CRUD (Create, Read, Update, Delete) with inline confirmation cards ensuring human-in-the-loop review for all financial mutations.

## Impact

- **UI & Layout**:
  - `src/components/voice/`: Adds inline cards for query results (`ExpenseListCard`), update proposals (`ExpenseUpdateCard`), and deletion confirmations (`ExpenseDeleteCard`).
  - `src/components/voice/chat-message-item.tsx`: Renders new message types and CRUD cards.
- **State & Hooks**:
  - `src/types/expense.ts`: Extended with query, update, and delete payloads.
  - `src/hooks/use-voice-session.ts` & `src/hooks/use-expense-chat.ts`: Handlers for query execution, expense modification, and deletion.
- **Backend**:
  - `supabase/functions/_shared/openai.ts` & `prompts/expense-assistant.md`: Additional function calling tools and prompt instructions for query, update, and delete intents.
