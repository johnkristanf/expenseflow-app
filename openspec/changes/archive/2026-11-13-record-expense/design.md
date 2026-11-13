# Design

## Context

The app is a greenfield Expo SDK 58 / React Native project (`expenseflow-app`) backed by Supabase (PostgreSQL + Edge Functions + Auth). The existing web app (`expenseflow`) establishes the data model: `expenses`, `budgets`, `categories`, `accounts`, and `users` — all scoped by `user_id` with RLS. No voice or AI pipeline exists yet. All secrets must stay inside Supabase Edge Functions; the mobile client never holds `DEEPGRAM_API_KEY` or `OPENAI_API_KEY`.

---

## Goals / Non-Goals

**Goals:**
- Deliver end-to-end voice expense recording: mic capture → STT → AI entity extraction with Draft Slot-Filling clarification → human-confirmation card → atomic DB write.
- Keep the client thin: audio capture + Draft state management + UI only.
- Keep all AI and secret orchestration server-side inside a single Supabase Edge Function.
- Guarantee no silent DB writes; every expense requires explicit user confirmation.

**Non-Goals:**
- Multi-item (batch) expense recording in a single voice session.
- Offline voice recording or local STT fallback.
- Real-time budget analytics or dashboards as part of this change.
- Modifying or replacing any existing manual expense entry form.
- Saving raw transcripts to the database.

---

## Decisions

### Decision 1: Audio Transport — WebSocket Streaming vs Push-to-Talk Buffer

**Chosen: Push-to-Talk One-Shot Buffer with Deepgram JS SDK**

The user holds the mic button, the Expo audio module records locally into memory, and the full audio buffer is sent to the Edge Function once the user releases the button. The Edge Function transcribes the audio using the official Deepgram JavaScript SDK (`@deepgram/sdk`) with model `nova-3` and `smart_format: true`, returning the final transcript to the reasoning pipeline.

**Alternatives considered:**
- *Live WebSocket Streaming directly to Deepgram from client* — requires the Deepgram API key to be reachable from the mobile client (or proxied), adds WebSocket keep-alive complexity on mobile radios, and provides no meaningful UX benefit for short expense utterances (5–15 seconds). Rejected.
- *WebSocket Streaming via Edge Function proxy* — adds significant infrastructure complexity for marginal latency gain on short audio. Deferred to a future iteration.

**Rationale:** Push-to-Talk is network-resilient, easy to implement in Expo, and perfectly adequate for the expected 5–15 second utterance length. The 1–2 second wait after releasing the mic is acceptable for a financial entry that requires a confirmation step anyway.

---

### Decision 2: LLM Conversational State — Draft Slot-Filling over Raw Message Array

**Chosen: Draft Slot-Filling**

The mobile client holds a typed `ExpenseDraft` object in React state:

```typescript
type ExpenseDraft = {
  amount?: number;
  description?: string;
  categoryId?: number;
  budgetId?: number;
  spendingType?: "needs" | "wants";
  dateSpent?: string;
};
```

On every turn the client POSTs to the Edge Function:
```typescript
{ transcript: string; activeDraft: ExpenseDraft; }
```

The Edge Function's system prompt explicitly frames the user's speech as an answer to a specific missing field within the draft, preventing the LLM from treating follow-up input as a new unrelated expense.

**Alternatives considered:**
- *Raw message array (chat history strings)* — simpler, but the LLM can drift: it may re-interpret a resolved field differently or treat the follow-up speech as a new query. For a financial app, field drift is unacceptable. Rejected.
- *Server-side session store (Redis/Supabase KV)* — avoids sending state from the client but adds infrastructure. Because the Edge Function is stateless and sessions are short (< 60 seconds), client-held draft is simpler and equally reliable. Rejected.

---

### Decision 3: AI Reasoning & Tool Schema — OpenAI TypeScript SDK Responses API (`gpt-5-nano`)

The Edge Function uses the official OpenAI TypeScript SDK (`npm:openai`) and the Responses API (`openai.responses.create`) with model `gpt-5-nano`. It configures exactly two function tools:

| Tool | Called when |
|------|------------|
| `record_expense` | All required fields are resolved (amount, description, at minimum) |
| `ask_clarification` | Any required field is missing or ambiguous |

`ask_clarification` returns: `{ question: string; missingEntity: string; suggestedOptions?: string[] }`.

The Edge Function routes on the tool call returned in the response output — no ambiguity.

---

### Decision 4: Category & Budget Resolution Order

The Edge Function resolves `categoryId` and `budgetId` using this priority order:

1. **Explicit name match** — user named the category/budget verbatim.
2. **Historical affinity** — a small recent-transaction dictionary is derived from the user's last 20 expenses, mapping description keywords to `(categoryId, budgetId)` pairs. Injected into the prompt context.
3. **Semantic inference** — LLM uses world knowledge + category `notes` field to infer the best match.
4. **Ambiguity → `ask_clarification`** — if two or more categories score equally likely, the LLM asks.
5. **No match → `ask_clarification`** — if no category/budget exists for the expense type.

`budgetId` is nullable. If the user does not specify a budget and no confident match exists, the draft can carry `budgetId: undefined` and the confirmation card lets the user pick one manually.

---

### Decision 5: Atomic DB Commit via Supabase RPC

Rather than two sequential REST calls from the client (which could orphan an expense if the budget update fails), the commit is handled by a PostgreSQL stored procedure called via `supabase.rpc('record_expense', payload)`:

```sql
-- Pseudocode
BEGIN;
  SELECT current_amount FROM budgets WHERE id = budget_id FOR UPDATE;
  -- Guard: raise if current_amount < amount
  UPDATE budgets SET current_amount = current_amount - amount WHERE id = budget_id;
  INSERT INTO expenses (...) RETURNING *;
COMMIT;
```

If `budgetId` is null, only the INSERT runs. The RPC enforces RLS so only the authenticated user's budgets and expenses are touched.

---

### Decision 6: TTS Feedback via Deepgram Aura-2

After every Edge Function response (whether `record_expense` or `ask_clarification`), the function synthesizes spoken audio using Deepgram Aura-2 (`aura-2-thalia-en`) via the Deepgram JS SDK. The client plays this using `expo-audio`. The TTS call is non-blocking to the structured JSON response — both are returned in the same Edge Function response body:

```json
{
  "action": "record_expense | ask_clarification",
  "payload": { ... },
  "ttsAudio": "<base64-mp3>"
}
```

---

### Decision 7: Deepgram Integration via Official JavaScript SDK (`@deepgram/sdk`)

Rather than maintaining manual `fetch` calls, authentication headers, and ad-hoc endpoint strings, the Edge Function integrates the official Deepgram JavaScript SDK configured in `supabase/functions/deno.json`:

```json
{
  "imports": {
    "@deepgram/sdk": "npm:@deepgram/sdk@^3.11.0"
  }
}
```

The shared module `supabase/functions/_shared/deepgram.ts` structures API usage following Deepgram agent skills best practices:

1. **Client Instantiation**: Created per-request with `createClient(apiKey)`.
2. **Speech-to-Text (`transcribeAudio`)**:
   - Converts the incoming base64 mobile recording into a `Uint8Array`.
   - Invokes `deepgram.listen.prerecorded.transcribeFile` with `model: "nova-3"`, `smart_format: true`, and `mimetype: "audio/m4a"`.
   - Extracts `result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || ""`.
   - Logs structured Deepgram error metadata if transcription fails.
3. **Text-to-Speech (`synthesizeSpeech`)**:
   - Input validation: Trims text and guards against empty string inputs (which Deepgram rejects with HTTP 400).
   - Voice model: Uses Aura-2 `aura-2-thalia-en` via `deepgram.speak.request({ text }, { model: "aura-2-thalia-en" })`.
   - Audio extraction: Calls `response.getStream()`, consumes the `ReadableStream` into a binary buffer, and converts it to base64.
   - Fault tolerance: Any TTS failure logs a warning and returns an empty string without failing the assistant chat response.

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Deepgram or OpenAI latency spikes make the voice loop feel slow | Show a loading animation ("AI is thinking...") immediately after the mic is released; set a 10-second timeout with a user-visible error |
| LLM misidentifies `categoryId` or `budgetId` despite Draft Slot-Filling | The confirmation card is always shown and all fields are user-editable before commit — the user corrects errors with two taps |
| Audio recording fails mid-session on Android (background permission) | Display mic permission prompt at app first-launch; handle `expo-av` errors gracefully with a user-facing toast |
| Supabase Edge Function cold-start adds latency on first use | Acceptable for this feature; warm-up strategies can be added later |
| `record_expense` RPC race condition (two simultaneous commits on same budget) | `SELECT ... FOR UPDATE` in the RPC serialises concurrent commits safely |
| User speaks a language other than English | Deepgram Nova-3 supports multi-language; language can be passed as a query param. Out of scope for this change — English only initially |

---

## Migration Plan

1. Deploy the `record_expense` PostgreSQL stored procedure via a new Supabase migration file.
2. Deploy the `assistant-chat` Supabase Edge Function with `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` set as Edge Function secrets (never in client env).
3. Ship the mobile UI changes (voice sheet, confirmation card) as a standard Expo app update — no breaking changes to existing screens.
4. No rollback complexity: the new feature is purely additive; existing expense entry forms are unaffected.

---

## Open Questions

- Should `budgetId` be required at the confirmation card level (force the user to pick one before confirming), or remain optional (allow `budget_id = null` expenses)? The DB schema allows null — deferring this UX policy decision to implementation review.
