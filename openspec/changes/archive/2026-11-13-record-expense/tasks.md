# Tasks

## 1. Database: `record_expense` Stored Procedure

- [x] 1.1 Create a new Supabase migration file that defines the `record_expense(payload jsonb)` PostgreSQL stored procedure: SELECT…FOR UPDATE on `budgets`, balance guard (raise if insufficient), UPDATE `budgets.current_amount`, INSERT into `expenses`, return the new expense row. Verify by running the migration locally (`npx supabase db reset`) and calling the RPC with a known budget ID, confirming the expense row is created and the budget balance is decremented atomically.
- [x] 1.2 Add RLS guard to the RPC so only the authenticated user's budgets and expenses are accessible (auth.uid() = user_id check inside the procedure). Verify by attempting to call the RPC with a mismatched user ID and confirming it raises a permission error.

## 2. Supabase Edge Function: `assistant-chat`

- [x] 2.1 Scaffold the `supabase/functions/assistant-chat/index.ts` Edge Function. Accept POST body `{ transcript: string; activeDraft: ExpenseDraft; userContext: { categories, budgets, recentAffinity } }`. Verify the function deploys locally (`npx supabase functions serve assistant-chat`) and returns a 200 on a valid ping request.
- [x] 2.2 Implement user-context fetching inside the Edge Function: query `categories` (id, name, notes) and `budgets` (id, name, currentAmount) scoped to the authenticated user, plus a recent-affinity dictionary from the last 20 `expenses` rows. Verify the query returns expected shape by logging output in local dev.
- [x] 2.3 Implement the OpenAI pipeline using the official OpenAI TypeScript SDK (`npm:openai`) and the Responses API (`openai.responses.create`) with model `gpt-5-nano` and two tools — `record_expense` and `ask_clarification` — using the loadable markdown Draft Slot-Filling prompt structure. Verify by sending a transcript with a missing amount and confirming the function returns `{ action: "ask_clarification", payload: { question, missingEntity, suggestedOptions? } }`.
- [x] 2.4 Implement the full entity resolution flow: explicit name match → historical affinity → semantic inference → ambiguity/no-match → `ask_clarification`. Verify by sending transcripts for each scenario (explicit, implicit, ambiguous, unmatched) and confirming the correct tool is called with the correct resolved IDs.
- [x] 2.5 Install `@deepgram/sdk` in `supabase/functions/deno.json` import map and structure `supabase/functions/_shared/deepgram.ts` using the official Deepgram JS SDK: implement `transcribeAudio` using Nova-3 with `smart_format: true` and `synthesizeSpeech` using Aura-2 (`aura-2-thalia-en`) with `getStream()` audio consumption, empty text guard, and base64 MP3 generation. Verify both STT and TTS succeed via the JS SDK.
- [ ] 2.6 Deploy the Edge Function to the Supabase project with `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` set as Edge Function secrets (not client env). Verify deployment succeeds (`npx supabase functions deploy assistant-chat`) and secrets are not exposed in the function source.

## 3. Mobile: Audio Capture & STT

- [x] 3.1 Install `expo-audio` via `npx expo install expo-audio`. Add required microphone permissions in `app.json` plugins config. Verify `npx expo-doctor` passes after the change.
- [x] 3.2 Implement `useVoiceRecorder` hook: requests microphone permission on first call, starts/stops `Audio.Recording` on press/release, returns the recorded audio URI and a permission error state. Verify: in a test screen, hold the button, speak, release — confirm an audio file URI is returned and permission error state is null when permission is granted.
- [x] 3.3 Implement audio upload to Edge Function: on release, read the audio file as a base64 blob, POST to `assistant-chat` with `{ transcript: "", activeDraft, audioBase64 }` — the Edge Function transcribes audio via the Deepgram JS SDK internally and returns the transcript before entity extraction. Verify the round-trip returns a transcript string from a 5-second real utterance.

## 4. Mobile: Draft Slot-Filling Session State

- [x] 4.1 Define the `ExpenseDraft` TypeScript type and a `useExpenseDraft` hook that holds the draft in React state, exposes `mergeDraft(partial: Partial<ExpenseDraft>)`, `clearDraft()`, and `isDraftComplete(): boolean`. Verify by unit-testing `mergeDraft` accumulates fields correctly across multiple calls and `clearDraft` resets to empty.
- [x] 4.2 Implement `useVoiceSession` hook that orchestrates: `useVoiceRecorder` → POST to `assistant-chat` with current draft → handle `record_expense` (merge full draft, transition to confirmation state) or `ask_clarification` (store question, play TTS, show chips, re-listen). Verify the state machine transitions correctly from `idle → recording → processing → clarifying → confirming → idle` using a mock Edge Function.

## 5. Mobile: Voice UI Components

- [x] 5.1 Implement the `VoiceRecordSheet` bottom sheet component (dark theme: `bg-slate-950`, border `border-slate-800`). Includes: animated mic button (hold to record), live transcript text display (interim words during recording), AI "thinking" loading state, and a close/discard button. Verify the sheet opens, the mic button animates on hold, and transcript text updates while recording.
- [x] 5.2 Implement the `ClarificationView` sub-component: displays the AI question text, plays TTS audio via `expo-av`, and renders quick-reply chips for `suggestedOptions`. Tapping a chip sends the chip text as the next transcript turn without re-recording audio. Verify chips appear from a mock `ask_clarification` payload and tapping one triggers re-processing.
- [x] 5.3 Implement the `ExpenseConfirmationCard` component: displays all draft fields as editable inputs — amount (`TextInput`), description (`TextInput`), category (`Select` dropdown populated from user categories), budget (`Select` dropdown showing remaining balance, with a "No Budget" option), spendingType (toggle: Needs / Wants), dateSpent (date picker). Confirm and Discard buttons. Verify all dropdowns populate with real user data fetched via TanStack Query and the Confirm button is disabled until `amount` and `description` are non-empty.
- [x] 5.4 Wire the Confirm action: on tap, call `supabase.rpc('record_expense', payload)` with the final draft values, handle insufficient-budget error (display toast), on success clear the draft, close the sheet, and invalidate TanStack Query caches for `expenses` and `budgets`. Verify by confirming a real expense against a seeded budget and confirming the budget balance decrements and the expense appears in the list.

## 6. Mobile: TTS Audio Playback

- [x] 6.1 Implement `useTTSPlayer` hook that accepts a base64 MP3 string, writes it to a temp file via `expo-file-system`, and plays it back with `expo-audio`. Expose `play(base64: string)` and `stop()`. Verify the hook plays audible audio from a sample base64 MP3 without crashing on Android and iOS.
- [x] 6.2 Integrate `useTTSPlayer` into `useVoiceSession`: call `play(ttsAudio)` immediately after each `record_expense` or `ask_clarification` response is received. Verify the audio plays before the confirmation card renders or clarification chips appear.

## 7. Integration & Navigation

- [x] 7.1 Add a floating voice mic FAB (Floating Action Button) to the main expenses or home tab, styled with the AI Voice Glow gradient (`cyan-400` → `violet-500`). Tapping it opens `VoiceRecordSheet` as a modal sheet. Verify the button renders on the correct screen and opens the sheet on tap.
- [x] 7.2 Wire `VoiceRecordSheet` to `useVoiceSession` and ensure session state is fully cleared when the sheet is dismissed (whether by discard, confirm, or swipe-down). Verify that opening the sheet twice in sequence starts a fresh draft each time.
- [x] 7.3 End-to-end smoke test: speak a full expense ("200 pesos at Jollibee"), confirm the AI resolves category and budget, the confirmation card appears with correct values, confirming writes the expense and decrements the budget, and the expense appears in the expenses list. Document the test steps in a brief `src/tests/voice-expense-e2e.md` note.

## Workflow follow-up

- Archive the change after all tasks are verified and the feature is reviewed: `/opsx-archive`.
