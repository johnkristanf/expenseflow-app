# Voice Expense E2E Smoke Test

## Prerequisites
- Local Supabase running (`npx supabase start`)
- `.env` has `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>`
- Edge Function running locally (`npx supabase functions serve assistant-chat`)
- `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` set via `npx supabase secrets set`
- At least one seeded category (e.g. "Food") and budget (e.g. "Monthly Groceries", balance ≥ 200)

## Test Steps

### Happy Path — Full Utterance

1. Open app on device/emulator. Home screen shows expenses list and cyan-violet FAB.
2. Tap FAB → `VoiceRecordSheet` slides up.
3. Hold mic button, say **"Two hundred pesos at Jollibee"**, release.
4. Sheet shows "Listening... Release when done" → transitions to spinner ("Analyzing expense...").
5. AI resolves:
   - `amount` = 200
   - `description` = "Jollibee"
   - `category` = Food (via affinity/semantic match)
   - `budget` = Monthly Groceries
6. `ExpenseConfirmationCard` appears with all fields pre-filled.
7. Verify budget balance shown on card is correct (e.g. ₱3800 remaining).
8. Tap **Confirm**.
9. Sheet closes. Expenses list updates — new entry "Jollibee ₱200.00" visible at top.
10. Navigate to Budgets — "Monthly Groceries" balance decremented by 200.

### Clarification Loop — Missing Amount

1. Hold mic, say **"Jollibee"** (no amount), release.
2. AI returns `ask_clarification` — TTS plays "How much did you spend?".
3. `ClarificationView` shows question + optional chips (e.g. "₱50", "₱100", "₱200").
4. Tap chip **₱200** or hold mic and say "Two hundred pesos".
5. AI merges draft, proceeds to `ExpenseConfirmationCard`.
6. Confirm → expense recorded.

### Insufficient Budget Guard

1. Set budget balance to ₱0 (or attempt amount > balance).
2. Confirm expense → RPC raises error.
3. Sheet stays on confirmation card; error message shown in red banner.

### Session Reset

1. Open sheet → start recording → tap X (close).
2. Reopen sheet → draft is empty, transcript cleared, mic ready.

## Local DB Verification

```sql
-- Confirm expense inserted
SELECT * FROM expenses ORDER BY created_at DESC LIMIT 1;

-- Confirm budget decremented
SELECT name, current_amount FROM budgets WHERE name = 'Monthly Groceries';
```

## Expected Results

| Step | Expected |
|------|----------|
| Utterance sent | Deepgram STT returns transcript |
| OpenAI tool call | `record_expense` tool selected with correct resolved IDs |
| Confirmation card | All 4 required fields pre-filled |
| Confirm tap | `expenses` row created, `budgets.current_amount` decremented |
| List refresh | New expense visible immediately (TanStack Query cache invalidated) |
