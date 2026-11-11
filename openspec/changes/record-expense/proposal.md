# Proposal

## Why

ExpenseFlow is a voice-first personal finance app. Without a voice expense recording feature, users must navigate manual forms to log expenses — defeating the app's core hands-free premise. This change delivers the core AI voice recording loop so users can speak a natural-language expense and have it confirmed and committed in seconds.

## What Changes

- **New**: Microphone capture UI on the mobile app (push-to-talk / hold-to-speak interaction pattern).
- **New**: Real-time transcription via Deepgram Nova-3 STT WebSocket stream displayed inline as the user speaks.
- **New**: Supabase Edge Function `assistant-chat` orchestrating the AI pipeline: Deepgram STT → OpenAI entity extraction with structured tool calling → Deepgram Aura TTS spoken feedback.
- **New**: Draft Slot-Filling protocol — the mobile app maintains a transient `ExpenseDraft` JSON object between conversational turns. The edge function receives the current draft alongside the new transcript on every turn, so the LLM always resolves answers against the correct in-progress context rather than treating follow-up speech as a new unrelated query.
- **New**: Conversational clarification loop — when required fields (amount, description, category, budget) cannot be resolved from the transcript, the AI issues an `ask_clarification` tool call, Deepgram Aura speaks the question aloud, and optional quick-reply chips appear in the UI for tap or voice answer.
- **New**: AI category and budget resolution — the edge function injects the user's full category list (id, name, notes) and budget list (id, name, currentAmount) into the LLM context, enabling both explicit name matching and semantic/world-knowledge inference.
- **New**: Dark-theme interactive Confirmation Card — displays the AI-proposed expense with editable fields (amount, description, category dropdown, budget dropdown, spending type, date) before any database write occurs.
- **New**: Atomic expense commit via Supabase — a single database transaction inserts into `expenses` and deducts `budgets.currentAmount`, with a balance guard preventing overdraft.

## Capabilities

### New Capabilities

- `voice-expense-recording`: End-to-end voice-driven flow for recording an expense: speech capture, AI entity extraction with Draft Slot-Filling clarification loop, human-in-the-loop confirmation, and atomic write to `expenses` + `budgets`.

### Modified Capabilities

*(None — this is a net-new capability.)*

## Impact

- **New Supabase Edge Function**: `assistant-chat` — orchestrates Deepgram STT result → OpenAI tool calling → Deepgram Aura TTS audio response.
- **New React Native Screens / Components**: Voice recording sheet, animated mic button, transcript live view, clarification quick-chips, confirmation card.
- **Supabase Database**: Writes to `expenses` (INSERT) and `budgets` (UPDATE currentAmount) atomically. Reads `categories` and `budgets` for user context injection. No new tables are introduced.
- **New Dependencies** (to be installed via `npx expo install`): `expo-av` or equivalent Expo audio recording module; Deepgram JS SDK (or raw WebSocket usage for audio streaming).
- **Secrets**: `DEEPGRAM_API_KEY` and `OPENAI_API_KEY` are used exclusively inside the Supabase Edge Function and are never exposed to the mobile client.
- **No Breaking Changes**: All existing screens, navigation, and database tables remain unaffected. The voice recording entry point is an additive UI element.
